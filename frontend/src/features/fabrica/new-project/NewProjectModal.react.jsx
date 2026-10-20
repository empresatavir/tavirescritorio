import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  RadioGroup,
  ScrollArea,
  Separator,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

function fileNames(list) {
  return list.map((f) => f.name);
}

export function NewProjectModalReact(props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [ownership, setOwnership] = useState("");
  const [track, setTrack] = useState("zero");
  const [stackFrontend, setStackFrontend] = useState("");
  const [stackBackend, setStackBackend] = useState("");
  const [stackDatabase, setStackDatabase] = useState("");
  const [contextFiles, setContextFiles] = useState([]);
  const [designSystemFiles, setDesignSystemFiles] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const workspaceHint =
    ownership === "interno"
      ? "Workspace → …/tavirescritorio/tavir-interno/<slug>"
      : ownership === "externo"
        ? "Workspace → …/tavirescritorio/tavir-exterrno/<slug>"
        : "Escolha Interno ou Externo para definir a pasta do workspace";

  const contextRef = useRef(null);
  const dsRef = useRef(null);

  useEffect(() => {
    if (!props.open) return;
    setError(null);
  }, [props.open]);

  const categoryHint = useMemo(() => {
    if (props.preferredCategory === "lp") return "Landing Pages";
    if (props.preferredCategory === "of") return "Ofertas";
    if (props.preferredCategory === "sy") return "Sistemas";
    return null;
  }, [props.preferredCategory]);

  const reset = () => {
    setName("");
    setCompany("");
    setOwnership("");
    setTrack("zero");
    setStackFrontend("");
    setStackBackend("");
    setStackDatabase("");
    setContextFiles([]);
    setDesignSystemFiles([]);
    setError(null);
    if (contextRef.current) contextRef.current.value = "";
    if (dsRef.current) dsRef.current.value = "";
  };

  const onContextChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setContextFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      for (const f of files) map.set(f.name, f);
      return [...map.values()];
    });
  };

  const onDsChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setDesignSystemFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      for (const f of files) map.set(f.name, f);
      return [...map.values()];
    });
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("O nome do projeto é obrigatório.");
      return;
    }
    if (ownership !== "interno" && ownership !== "externo") {
      setError("Selecione se o projeto é Interno ou Externo.");
      return;
    }
    if (track === "pronto" && contextFiles.length === 0) {
      setError(
        "Projeto com escopo fechado exige ao menos um documento de escopo em “Importar Arquivos”.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await props.onSubmit({
        name: trimmed,
        company: company.trim() || undefined,
        ownership,
        track,
        context_files: fileNames(contextFiles),
        design_system_files: fileNames(designSystemFiles),
        stack_frontend: stackFrontend.trim() || undefined,
        stack_backend: stackBackend.trim() || undefined,
        stack_database: stackDatabase.trim() || undefined,
        template_category: props.preferredCategory,
      });
      reset();
      props.onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao criar o projeto.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Theme
      appearance="dark"
      accentColor="teal"
      grayColor="slate"
      radius="large"
      scaling="95%"
      style={{ minHeight: 0 }}
    >
      <Dialog.Root
        open={props.open}
        onOpenChange={(open) => {
          if (!open) reset();
          props.onOpenChange(open);
        }}
      >
        <Dialog.Content
          maxWidth="640px"
          style={{
            padding: 0,
            overflow: "hidden",
            background: "#0F172A",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <Box px="5" pt="4" pb="3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Flex align="start" justify="between" gap="3">
              <Box>
                <Dialog.Title size="4" mb="1">
                  Novo Projeto
                </Dialog.Title>
                <Dialog.Description size="2" color="gray">
                  Cadastre a iniciativa e defina a esteira de ideação. Anexos de Design System ficam
                  isolados do escopo geral.
                </Dialog.Description>
                {categoryHint ? (
                  <Badge color="teal" variant="soft" mt="2">
                    Esteira · {categoryHint}
                  </Badge>
                ) : null}
              </Box>
              <Dialog.Close>
                <Button variant="ghost" color="gray" highContrast>
                  Fechar
                </Button>
              </Dialog.Close>
            </Flex>
          </Box>

          <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: "min(62vh, 560px)" }}>
            <Flex direction="column" gap="4" px="5" py="4">
              {error ? (
                <Callout.Root color="red" role="alert">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              ) : null}

              <Flex direction="column" gap="3">
                <Text as="label" size="2" weight="medium" htmlFor="np-name">
                  Nome do Projeto <Text color="red">*</Text>
                </Text>
                <TextField.Root
                  id="np-name"
                  placeholder="Ex: Redesign E-commerce B2B"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Text as="label" size="2" weight="medium" htmlFor="np-company">
                  Nome da Empresa
                </Text>
                <TextField.Root
                  id="np-company"
                  placeholder="Ex: Meridian Labs, TAVIR Interno"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  Projeto Interno ou Externo <Text color="red">*</Text>
                </Text>
                <Text size="1" color="gray">
                  Define a pasta raiz do workspace no disco. Obrigatório em qualquer esteira.
                </Text>
                <RadioGroup.Root value={ownership || undefined} onValueChange={(v) => setOwnership(v)}>
                  <Flex direction="column" gap="2">
                    <Box
                      p="3"
                      style={{
                        borderRadius: 12,
                        border:
                          ownership === "interno"
                            ? "1px solid var(--teal-8)"
                            : "1px solid var(--gray-a5)",
                        background: ownership === "interno" ? "var(--teal-a2)" : "var(--gray-a2)",
                      }}
                    >
                      <Text as="label" size="2">
                        <Flex gap="2" align="start">
                          <RadioGroup.Item value="interno" />
                          <Box>
                            <Text weight="bold">Projeto Interno</Text>
                            <Text as="p" size="1" color="gray" mt="1">
                              Workspace em{" "}
                              <Text as="span" style={{ fontFamily: "var(--font-mono, ui-monospace)" }}>
                                tavir-interno/
                              </Text>{" "}
                              — iniciativas TAVIR / uso interno.
                            </Text>
                          </Box>
                        </Flex>
                      </Text>
                    </Box>

                    <Box
                      p="3"
                      style={{
                        borderRadius: 12,
                        border:
                          ownership === "externo"
                            ? "1px solid var(--lime-8, #B7F34A)"
                            : "1px solid var(--gray-a5)",
                        background:
                          ownership === "externo" ? "rgba(183,243,74,0.08)" : "var(--gray-a2)",
                      }}
                    >
                      <Text as="label" size="2">
                        <Flex gap="2" align="start">
                          <RadioGroup.Item value="externo" />
                          <Box>
                            <Text weight="bold">Projeto Externo</Text>
                            <Text as="p" size="1" color="gray" mt="1">
                              Workspace em{" "}
                              <Text as="span" style={{ fontFamily: "var(--font-mono, ui-monospace)" }}>
                                tavir-exterrno/
                              </Text>{" "}
                              — clientes e demandas externas.
                            </Text>
                          </Box>
                        </Flex>
                      </Text>
                    </Box>
                  </Flex>
                </RadioGroup.Root>
                <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono, ui-monospace)" }}>
                  {workspaceHint}
                </Text>
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  Tipo de projeto / esteira
                </Text>
                <RadioGroup.Root value={track} onValueChange={(v) => setTrack(v)}>
                  <Flex direction="column" gap="2">
                    <Box
                      p="3"
                      style={{
                        borderRadius: 12,
                        border:
                          track === "zero"
                            ? "1px solid var(--teal-8)"
                            : "1px solid var(--gray-a5)",
                        background: track === "zero" ? "var(--teal-a2)" : "var(--gray-a2)",
                      }}
                    >
                      <Text as="label" size="2">
                        <Flex gap="2" align="start">
                          <RadioGroup.Item value="zero" />
                          <Box>
                            <Text weight="bold">Projeto do Zero</Text>
                            <Text as="p" size="1" color="gray" mt="1">
                              Dispara a esteira longa de ideação: a agente entrevista e questiona
                              iterativamente para levantar requisitos — não presume escopo fechado.
                            </Text>
                          </Box>
                        </Flex>
                      </Text>
                    </Box>

                    <Box
                      p="3"
                      style={{
                        borderRadius: 12,
                        border:
                          track === "pronto"
                            ? "1px solid var(--lime-8, #B7F34A)"
                            : "1px solid var(--gray-a5)",
                        background: track === "pronto" ? "rgba(183,243,74,0.08)" : "var(--gray-a2)",
                      }}
                    >
                      <Text as="label" size="2">
                        <Flex gap="2" align="start">
                          <RadioGroup.Item value="pronto" />
                          <Box>
                            <Text weight="bold">Projeto Existente (Escopo Fechado)</Text>
                            <Text as="p" size="1" color="gray" mt="1">
                              Exige documento de escopo. A agente só lê, mapeia e resolve
                              ambiguidades — instruída a não inventar regras; omisso → pergunta ao
                              operador.
                            </Text>
                          </Box>
                        </Flex>
                      </Text>
                    </Box>
                  </Flex>
                </RadioGroup.Root>
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="2" weight="medium">
                    Stack (opcional)
                  </Text>
                  <Text size="1" color="gray">
                    3 campos separados
                  </Text>
                </Flex>
                <Flex gap="2" wrap="wrap">
                  <Box style={{ flex: "1 1 140px" }}>
                    <Text as="label" size="1" color="gray" htmlFor="np-fe">
                      Front-end
                    </Text>
                    <TextField.Root
                      id="np-fe"
                      mt="1"
                      placeholder="Solid / React…"
                      value={stackFrontend}
                      onChange={(e) => setStackFrontend(e.target.value)}
                    />
                  </Box>
                  <Box style={{ flex: "1 1 140px" }}>
                    <Text as="label" size="1" color="gray" htmlFor="np-be">
                      Back-end
                    </Text>
                    <TextField.Root
                      id="np-be"
                      mt="1"
                      placeholder="FastAPI…"
                      value={stackBackend}
                      onChange={(e) => setStackBackend(e.target.value)}
                    />
                  </Box>
                  <Box style={{ flex: "1 1 140px" }}>
                    <Text as="label" size="1" color="gray" htmlFor="np-db">
                      Banco
                    </Text>
                    <TextField.Root
                      id="np-db"
                      mt="1"
                      placeholder="SQLite / Postgres…"
                      value={stackDatabase}
                      onChange={(e) => setStackDatabase(e.target.value)}
                    />
                  </Box>
                </Flex>
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="3">
                <Text size="2" weight="medium">
                  Arquivos
                </Text>

                <Box
                  p="3"
                  style={{
                    borderRadius: 12,
                    border: "1px dashed var(--gray-a6)",
                    background: "var(--gray-a2)",
                  }}
                >
                  <Flex justify="between" align="center" gap="3" mb="2">
                    <Box>
                      <Text size="2" weight="medium">
                        Importar Arquivos
                      </Text>
                      <Text as="p" size="1" color="gray">
                        Documentos gerais / escopo (.md, .pdf, .html, .json…).
                        {track === "pronto" ? " Obrigatório para escopo fechado." : ""}
                      </Text>
                    </Box>
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      onClick={() => contextRef.current?.click()}
                    >
                      Anexar
                    </Button>
                    <input
                      ref={contextRef}
                      type="file"
                      multiple
                      accept=".md,.txt,.html,.json,.pdf,.doc,.docx"
                      hidden
                      onChange={onContextChange}
                    />
                  </Flex>
                  {contextFiles.length === 0 ? (
                    <Text size="1" color="gray">
                      Nenhum arquivo de contexto.
                    </Text>
                  ) : (
                    <Flex gap="2" wrap="wrap">
                      {contextFiles.map((f) => (
                        <Flex key={f.name} align="center" gap="1">
                          <Badge variant="surface" color="gray">
                            {f.name}
                          </Badge>
                          <Button
                            type="button"
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() =>
                              setContextFiles((prev) => prev.filter((x) => x.name !== f.name))
                            }
                          >
                            ×
                          </Button>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Box>

                <Box
                  p="3"
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--lime-a6, rgba(183,243,74,0.35))",
                    background: "rgba(183,243,74,0.06)",
                  }}
                >
                  <Flex justify="between" align="center" gap="3" mb="2">
                    <Box>
                      <Text size="2" weight="medium">
                        Design System
                      </Text>
                      <Text as="p" size="1" color="gray">
                        Isolado: tokens, JSON, HTML, PDF, CSS… tratados como regra de design
                        (múltiplos arquivos).
                      </Text>
                    </Box>
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      color="grass"
                      onClick={() => dsRef.current?.click()}
                    >
                      Anexar DS
                    </Button>
                    <input
                      ref={dsRef}
                      type="file"
                      multiple
                      accept=".json,.css,.md,.html,.pdf,.zip,.tokens"
                      hidden
                      onChange={onDsChange}
                    />
                  </Flex>
                  {designSystemFiles.length === 0 ? (
                    <Text size="1" color="gray">
                      Nenhum arquivo de Design System.
                    </Text>
                  ) : (
                    <Flex gap="2" wrap="wrap">
                      {designSystemFiles.map((f) => (
                        <Flex key={f.name} align="center" gap="1">
                          <Badge variant="surface" color="green">
                            {f.name}
                          </Badge>
                          <Button
                            type="button"
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() =>
                              setDesignSystemFiles((prev) => prev.filter((x) => x.name !== f.name))
                            }
                          >
                            ×
                          </Button>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Box>
              </Flex>
            </Flex>
          </ScrollArea>

          <Flex
            justify="between"
            align="center"
            px="5"
            py="3"
            gap="3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#070d18" }}
          >
            <Text size="1" color="gray">
              {ownership ? `Escopo: ${ownership}` : "Escopo: —"} · Track:{" "}
              {track === "zero" ? "ideacao-dora" : "execucao-direta"}
            </Text>
            <Flex gap="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={submitting}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                highContrast
                disabled={submitting || !name.trim() || !ownership}
                onClick={() => void handleSubmit()}
                style={{ background: "var(--lime, #B7F34A)", color: "#0B1220" }}
              >
                {submitting ? "Criando…" : "Criar Projeto"}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Theme>
  );
}
