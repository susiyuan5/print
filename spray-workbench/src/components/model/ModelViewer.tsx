import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export interface ModelViewerProps {
  modelUrl: string | null;
  fileName?: string;
  fileExtension?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  autoRotate?: boolean;
  background?: "dark" | "light" | "grid";
}

export interface ModelViewerState {
  status: "idle" | "loading" | "loaded" | "error";
  progress?: number;
  errorMessage?: string;
}

// callbacks are passed via a separate prop to avoid re-init on every render
export function ModelViewer({ modelUrl, fileName, fileExtension, showGrid = true, showAxes = false, autoRotate = false, background = "dark" }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationRef = useRef<number>(0);
  const prevUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<ModelViewerState>({ status: "idle" });

  // initialize three.js scene once
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;
    rendererRef.current = renderer;

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6060a0, 0.4);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -1, 5);
    scene.add(rimLight);

    // grid
    if (showGrid) {
      const grid = new THREE.GridHelper(10, 20, 0x333333, 0x222222);
      grid.name = "__grid__";
      scene.add(grid);
    }

    // axes
    if (showAxes) {
      const axes = new THREE.AxesHelper(2);
      axes.name = "__axes__";
      scene.add(axes);
    }

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // load/swap model when url changes
  useEffect(() => {
    if (!modelUrl || modelUrl === prevUrlRef.current) return;
    prevUrlRef.current = modelUrl;

    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!scene || !controls) return;

    // remove previous model
    if (modelRef.current) {
      disposeModel(modelRef.current);
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    setState({ status: "loading" });

    const ext = (fileExtension ?? fileName?.split(".").pop()?.toLowerCase() ?? "").trim();

    if (ext === "glb" || ext === "gltf") {
      loadGLB()
        .then((object) => placeModel(scene, object))
        .then(() => setState({ status: "loaded" }))
        .catch((err) => setState({ status: "error", errorMessage: err instanceof Error ? err.message : "模型加载失败" }));
    } else if (ext === "stl") {
      loadSTL()
        .then((mesh) => placeModel(scene, mesh))
        .then(() => setState({ status: "loaded" }))
        .catch((err) => setState({ status: "error", errorMessage: err instanceof Error ? err.message : "模型加载失败" }));
    } else if (ext === "obj") {
      loadOBJ()
        .then((mesh) => placeModel(scene, mesh))
        .then(() => setState({ status: "loaded" }))
        .catch((err) => setState({ status: "error", errorMessage: err instanceof Error ? err.message : "模型加载失败" }));
    } else {
      setState({ status: "error", errorMessage: `不支持的文件格式：.${ext || "未知"}。当前支持 .glb / .stl / .obj。` });
    }

    function loadGLB(): Promise<THREE.Object3D> {
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          modelUrl!,
          (gltf: GLTF) => resolve(gltf.scene),
          (progress) => {
            if (progress.total > 0) {
              setState({ status: "loading", progress: Math.round((progress.loaded / progress.total) * 100) });
            }
          },
          (error) => reject(error instanceof Error ? error : new Error("GLB 文件加载失败，请确认文件未损坏。")),
        );
      });
    }

    function loadSTL(): Promise<THREE.Mesh> {
      return new Promise((resolve, reject) => {
        const loader = new STLLoader();
        loader.load(
          modelUrl!,
          (geometry) => {
            const material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.1 });
            const mesh = new THREE.Mesh(geometry, material);
            resolve(mesh);
          },
          undefined,
          (error) => reject(error instanceof Error ? error : new Error("STL 文件加载失败，请确认文件未损坏。")),
        );
      });
    }

    function loadOBJ(): Promise<THREE.Group> {
      return new Promise((resolve, reject) => {
        const loader = new OBJLoader();
        loader.load(
          modelUrl!,
          (object) => {
            // OBJLoader returns a Group; apply default material to any mesh without one
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
                  child.material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.1 });
                }
              }
            });
            resolve(object);
          },
          undefined,
          (error) => reject(error instanceof Error ? error : new Error("OBJ 文件加载失败，请确认文件未损坏。")),
        );
      });
    }

    // placeModel now accepts Object3D (works for Group / Mesh / GLTF scene)
    function placeModel(scene: THREE.Scene, object: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // shift model to origin
      object.position.sub(center);

      // adjust camera
      const camera = cameraRef.current;
      if (camera && maxDim > 0) {
        const dist = maxDim * 2.2;
        camera.position.set(dist * 0.6, dist * 0.4, dist);
        camera.lookAt(0, 0, 0);
      }

      if (!controlsRef.current) return object;
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();

      scene.add(object);
      modelRef.current = object;
      return object;
    }
  }, [modelUrl, fileName, fileExtension]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="model-viewer" style={{ background: background === "dark" ? "#1a1a2e" : background === "light" ? "#f0f0f0" : "transparent" }}>
      {!modelUrl && (
        <div className="model-viewer-placeholder">
          <span>请选择模型文件进行预览</span>
          <small>支持 .glb / .stl</small>
        </div>
      )}

      {state.status === "loading" && (
        <div className="model-viewer-overlay">
          <div className="model-viewer-loading">
            <div className="spinner" />
            <span>加载模型中...</span>
            {state.progress != null && state.progress > 0 && <small>{state.progress}%</small>}
            {fileName && <small className="muted">{fileName}</small>}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="model-viewer-overlay">
          <div className="model-viewer-error">
            <span className="error-icon">!</span>
            <span>{state.errorMessage ?? "未知错误"}</span>
            {fileName && <small className="muted">{fileName}</small>}
          </div>
        </div>
      )}

      <div ref={containerRef} className="model-viewer-canvas" />
    </div>
  );
}

function disposeModel(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material) {
  const mat = material as unknown as Record<string, unknown>;
  for (const key of Object.keys(mat)) {
    const value = mat[key];
    if (value && typeof value === "object" && value !== null && "isTexture" in value) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}
