import "./pensando.css";

export function Pensando(props: { nome: string }) {
  return (
    <span class="tv-pensando" role="status">
      {props.nome} está pensando
      <span class="tv-pensando-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}
