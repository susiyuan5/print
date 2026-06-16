import { useRef, useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { downloadJson, resetData } from "../data/storage";
import { parseWorkbenchData } from "../data/validators";
import { useWorkbench } from "../state/WorkbenchProvider";

export function DataPage() {
  const { data, dispatch, source, setNotice } = useWorkbench();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseWorkbenchData(JSON.parse(text));
      dispatch({ type: "replace", data: parsed });
      setError("");
      setNotice("JSON 导入成功，数据已自动保存到浏览器本地。");
    } catch (err) {
      setError(err instanceof Error ? `导入失败：${err.message}` : "导入失败：无法读取 JSON。");
    }
  }

  return (
    <>
      <PageHeader title="数据管理" description="导入、导出和重置喷涂工作台数据。" />
      <section className="panel data-panel">
        <h2>当前数据</h2>
        <p>数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
        <p>本地保存键：<code>spray-workbench:data:v1</code></p>
        <p>最后更新时间：{data.updatedAt}</p>
        {error && <p className="error-text">{error}</p>}
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => downloadJson(data)}>导出 JSON</button>
          <button className="button ghost" type="button" onClick={() => inputRef.current?.click()}>导入 JSON</button>
          <button
            className="button ghost danger"
            type="button"
            onClick={() => {
              if (window.confirm("确认重置为示例数据吗？当前本地数据会被覆盖。")) {
                dispatch({ type: "replace", data: resetData() });
                setNotice("已重置为示例数据。");
              }
            }}
          >
            重置示例数据
          </button>
          <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
        </div>
      </section>
      <section className="panel">
        <h2>数据预览</h2>
        <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
      </section>
    </>
  );
}
