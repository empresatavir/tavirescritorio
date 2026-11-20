(() => {
  const form = document.querySelector("#form");
  const title = document.querySelector("#title");
  const intro = document.querySelector("#intro");
  const eyebrow = document.querySelector("#eyebrow");
  const company = document.querySelector("#company");
  const error = document.querySelector("#error");
  const submit = document.querySelector("#submit");
  const status = document.querySelector("#status");
  const next = document.querySelector("#next");
  const back = document.querySelector("#back");
  const progress = document.querySelector("[data-progress]");
  const progressLabel = document.querySelector("#progress-label");
  const progressNote = document.querySelector("#progress-note");
  const progressBar = document.querySelector("#progress-bar");
  const firstActions = document.querySelector("[data-first-actions]");
  const finalStep = document.querySelector("[data-final-step]");
  const sections = [...document.querySelectorAll("[data-stage]")];
  const token = location.pathname.split("/").filter(Boolean).pop();
  const query = location.search;
  let mode = "unified";

  const unavailable = () => {
    status.dataset.state = "error";
    eyebrow.textContent = "Convite indisponível";
    title.textContent = "Este link não está disponível.";
    intro.textContent = "Ele pode ter expirado ou já ter sido usado. Peça um novo convite à pessoa da TAVIR que falou com você.";
    company.hidden = true;
    document.querySelector("[data-loading]").hidden = true;
  };

  const syncLocal = () => {
    const physical = form.querySelector('[name="possui_loja_fisica"]:checked')?.value === "Sim";
    const block = form.querySelector('[data-conditional="loja-fisica"]');
    block.hidden = !physical;
    block.querySelectorAll("[data-conditional-required]").forEach((field) => {
      field.required = physical;
      field.disabled = !physical;
    });
  };

  const validateScopes = (scopes) => {
    error.hidden = true;
    for (const scope of scopes) {
      for (const field of scope.querySelectorAll("[data-required], input[required]")) {
        const markedRequired = field.hasAttribute("data-required");
        const emptyMarkedField = markedRequired && (
          ["radio", "checkbox"].includes(field.type)
            ? !scope.querySelector(`[name="${field.name}"]:checked`)
            : !String(field.value || "").trim()
        );
        if (!field.disabled && emptyMarkedField) {
          error.textContent = "Preencha os campos obrigatórios antes de continuar.";
          error.hidden = false;
          field.focus();
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
        if (!field.disabled && !field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      for (const group of scope.querySelectorAll("[data-required-group]")) {
        const name = group.dataset.requiredGroup;
        if (!scope.querySelector(`[name="${name}"]:checked`)) {
          error.textContent = "Selecione ao menos uma opção nos campos indicados.";
          error.hidden = false;
          group.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }
    }
    return true;
  };

  const serialise = () => {
    const data = new FormData(form);
    const body = {};
    for (const [key, value] of data.entries()) {
      body[key] = body[key] ? `${body[key]} | ${value}` : value;
    }
    return body;
  };

  const showStep = (step) => {
    sections.forEach((section) => { section.hidden = section.dataset.stage !== String(step); });
    const unified = mode === "unified";
    progress.hidden = !unified;
    firstActions.hidden = !unified || step !== 1;
    finalStep.hidden = step !== 2;
    back.hidden = !unified;
    if (unified) {
      progressLabel.textContent = `Etapa ${step} de 2`;
      progressNote.textContent = step === 1 ? "Contexto e objetivo" : "Operação e capacidade";
      progressBar.style.width = step === 1 ? "50%" : "100%";
      eyebrow.textContent = `Raio X TAVIR | Etapa ${step} de 2`;
    }
    syncLocal();
  };

  form.addEventListener("change", (event) => {
    if (event.target?.name === "possui_loja_fisica") syncLocal();
  });

  next.addEventListener("click", () => {
    const first = sections.find((section) => section.dataset.stage === "1");
    if (!validateScopes([first])) return;
    showStep(2);
    status.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  back.addEventListener("click", () => {
    showStep(1);
    status.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  fetch(`/api/forms/${encodeURIComponent(token)}/status${query}`, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(({ stage, mode: receivedMode, company_name: companyName, contact_name: contactName }) => {
      mode = receivedMode === "legacy" ? "legacy" : "unified";
      status.dataset.state = "ready";
      company.textContent = companyName
        ? `Convite preparado para ${companyName}${contactName ? ` · ${contactName}` : ""}`
        : "Convite individual";
      company.hidden = false;
      if (mode === "unified") {
        title.textContent = "Vamos construir o contexto completo do seu Raio X.";
        intro.textContent = "São duas telas no mesmo link e um único envio ao final. Reserve cerca de 15 minutos e responda com o que existe hoje.";
        showStep(1);
      } else {
        eyebrow.textContent = "Raio X TAVIR | Complemento";
        title.textContent = "Agora vamos tornar o plano viável para sua operação.";
        intro.textContent = "Este complemento pertence a um convite anterior e será enviado uma única vez.";
        showStep(Number(stage) === 2 ? 2 : 1);
      }
      form.hidden = false;
      document.querySelector("[data-loading]").hidden = true;
    })
    .catch(unavailable);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const second = sections.find((section) => section.dataset.stage === "2");
    if (!validateScopes([second, finalStep])) return;
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = "Registrando com segurança...";
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(token)}/submit${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serialise()),
      });
      if (!response.ok) throw Error();
      form.hidden = true;
      status.dataset.state = "success";
      eyebrow.textContent = "Informações recebidas";
      title.textContent = "Seu intake do Raio X foi concluído.";
      intro.textContent = "A TAVIR revisará as informações e só então iniciará a análise. O diagnóstico e o plano serão enviados após a revisão final.";
      company.hidden = true;
      document.querySelector("[data-after-submit]").hidden = false;
    } catch {
      error.textContent = "Não foi possível registrar agora. Confira os campos. Se o problema continuar, peça um novo convite à TAVIR.";
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = "Enviar Raio X completo";
    }
  });
})();
