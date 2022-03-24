(doc => {
  const DOCS_SELECTOR = "#docs";
  const ENV = [
    {
      selector: "#switch-prod",
      docsURL: "https://raw.githubusercontent.com/wri/fw_forms/production/docs/fw_forms.yaml"
    },
    {
      selector: "#switch-staging",
      docsURL: "https://raw.githubusercontent.com/wri/fw_forms/staging/docs/fw_forms.yaml"
    },
    {
      selector: "#switch-dev",
      docsURL: "https://raw.githubusercontent.com/wri/fw_forms/dev/docs/fw_forms.yaml"
    }
  ];

  let activeSwitch;
  const activateSwitch = selector => {
    if (activeSwitch) {
      activeSwitch.classList.remove("active");
    }
    activeSwitch = doc.querySelector(selector);
    activeSwitch.classList.add("active");
  };

  const switchDocs = async env => {
    const docs = doc.querySelector(DOCS_SELECTOR);
    activateSwitch(env.selector);
    docs.apiDescriptionDocument = "";
    docs.apiDescriptionDocument = await fetch(env.docsURL).then(res => res.text());
  };

  const init = () => {
    ENV.forEach((env) => {
      const switcher = doc.querySelector(env.selector);

      switcher.addEventListener("click", () => {
        switchDocs(env);
      });
    });

    const firstEnv = [...ENV].shift();
    switchDocs(firstEnv);
  };

  doc.addEventListener("DOMContentLoaded", init);
})(document);
