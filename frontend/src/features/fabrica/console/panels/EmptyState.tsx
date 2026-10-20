export function EmptyState(props: { title: string; text?: string }) {
  return (
    <div class="fc-empty">
      <strong>{props.title}</strong>
      {props.text ? <p>{props.text}</p> : null}
    </div>
  );
}
