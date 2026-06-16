export function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <button
      type="button"
      className="button ghost danger"
      onClick={() => {
        if (window.confirm("确认删除吗？相关引用会一起清理。")) onConfirm();
      }}
    >
      删除
    </button>
  );
}
