/* ==========================================================================
   Public site behavior - vanilla JS
   ========================================================================== */

const MDI_PHONE_IN_TALK_OUTLINE_PATH =
  "M20 15.5C18.8 15.5 17.5 15.3 16.4 14.9H16.1C15.8 14.9 15.6 15 15.4 15.2L13.2 17.4C10.4 15.9 8 13.6 6.6 10.8L8.8 8.6C9.1 8.3 9.2 7.9 9 7.6C8.7 6.5 8.5 5.2 8.5 4C8.5 3.5 8 3 7.5 3H4C3.5 3 3 3.5 3 4C3 13.4 10.6 21 20 21C20.5 21 21 20.5 21 20V16.5C21 16 20.5 15.5 20 15.5M5 5H6.5C6.6 5.9 6.8 6.8 7 7.6L5.8 8.8C5.4 7.6 5.1 6.3 5 5M19 19C17.7 18.9 16.4 18.6 15.2 18.2L16.4 17C17.2 17.2 18.1 17.4 19 17.4V19M15 12H17A5 5 0 0 0 12 7V9A3 3 0 0 1 15 12M19 12H21C21 7 16.97 3 12 3V5C15.86 5 19 8.13 19 12Z";

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const nav = document.getElementById("site-nav");
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  function setLocaleCookie(locale) {
    if (!locale) return;
    document.cookie = `melkior_locale=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
  }

  document.querySelectorAll("[data-locale-target]").forEach((link) => {
    link.addEventListener("click", () => setLocaleCookie(link.dataset.localeTarget));
  });

  document.querySelectorAll(".timeline-year").forEach((year) => {
    const value = year.textContent.trim().toLowerCase();
    if (value === "today" || value === "aujourd'hui" || value === "aujourd’hui") {
      year.textContent = String(new Date().getFullYear());
    }
  });

  if (hamburger && navMenu) {
    function closeMenu() {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
      if (nav) nav.classList.remove("menu-open");
      hamburger.setAttribute("aria-expanded", "false");
      body.classList.remove("overflow-hidden");
    }

    function openMenu() {
      hamburger.classList.add("active");
      navMenu.classList.add("active");
      if (nav) nav.classList.add("menu-open");
      hamburger.setAttribute("aria-expanded", "true");
      body.classList.add("overflow-hidden");
    }

    hamburger.addEventListener("click", () => {
      if (navMenu.classList.contains("active")) closeMenu();
      else openMenu();
    });

    navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navMenu.classList.contains("active")) closeMenu();
    });
  }

  if (nav) {
    const updateNav = () => {
      if (window.scrollY > 24) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const offset = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  const calculator = document.querySelector(".calculator-card");
  if (calculator) {
    const result = calculator.querySelector("[data-payment-result]");
    const amountInput = calculator.querySelector("[data-money-input]");
    const percentInput = calculator.querySelector("[data-percent-input]");
    const yearsInput = calculator.querySelector("[data-years-input]");
    const isCalculatorEnglish = body.dataset.locale === "en-CA";
    const formatter = new Intl.NumberFormat(body.dataset.locale || "fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });
    const moneyInputFormatter = new Intl.NumberFormat("en-CA", {
      maximumFractionDigits: 0,
    });

    function parseMoneyInput(value) {
      return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
    }

    function formatMoneyInput(input) {
      if (!input) return;
      const amount = parseMoneyInput(input.value);
      input.value = amount ? `${moneyInputFormatter.format(amount)}$` : "";
    }

    function showRawMoneyInput(input) {
      if (!input) return;
      const amount = parseMoneyInput(input.value);
      input.value = amount ? String(amount) : "";
    }

    function parsePercentInput(value) {
      return Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;
    }

    function formatPercentInput(input) {
      if (!input) return;
      const value = parsePercentInput(input.value);
      input.value = value ? `${value.toFixed(2).replace(/\.?0+$/, "")}%` : "";
    }

    function showRawPercentInput(input) {
      if (!input) return;
      const value = parsePercentInput(input.value);
      input.value = value ? String(value) : "";
    }

    function parseYearsInput(value) {
      return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
    }

    function formatYearsInput(input) {
      if (!input) return;
      const years = parseYearsInput(input.value);
      if (!years) {
        input.value = "";
        return;
      }
      const suffix = isCalculatorEnglish
        ? years === 1 ? "year" : "years"
        : years === 1 ? "année" : "années";
      input.value = `${years} ${suffix}`;
    }

    function showRawYearsInput(input) {
      if (!input) return;
      const years = parseYearsInput(input.value);
      input.value = years ? String(years) : "";
    }

    function sanitizeYearsInput(input) {
      if (!input) return;
      input.value = input.value.replace(/[^\d]/g, "");
    }

    function calculatePayment() {
      const amount = parseMoneyInput(calculator.elements.amount.value);
      const annualRate = parsePercentInput(calculator.elements.rate.value);
      const years = parseYearsInput(calculator.elements.years.value);
      const frequency = calculator.elements.frequency.value;
      const months = Math.max(years * 12, 1);
      const monthlyRate = annualRate / 100 / 12;
      let monthly;

      if (monthlyRate === 0) monthly = amount / months;
      else {
        const factor = Math.pow(1 + monthlyRate, months);
        monthly = amount * ((monthlyRate * factor) / (factor - 1));
      }

      const payment = frequency === "biweekly" ? (monthly * 12) / 26 : monthly;
      result.textContent = formatter.format(Number.isFinite(payment) ? payment : 0);
    }

    if (amountInput) {
      formatMoneyInput(amountInput);
      amountInput.addEventListener("focus", () => showRawMoneyInput(amountInput));
      amountInput.addEventListener("blur", () => formatMoneyInput(amountInput));
    }
    if (percentInput) {
      formatPercentInput(percentInput);
      percentInput.addEventListener("focus", () => showRawPercentInput(percentInput));
      percentInput.addEventListener("blur", () => formatPercentInput(percentInput));
    }
    if (yearsInput) {
      formatYearsInput(yearsInput);
      yearsInput.addEventListener("focus", () => showRawYearsInput(yearsInput));
      yearsInput.addEventListener("input", () => sanitizeYearsInput(yearsInput));
      yearsInput.addEventListener("blur", () => formatYearsInput(yearsInput));
    }
    calculator.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", calculatePayment);
    });
    calculatePayment();
  }

  const modal = document.getElementById("form-modal");
  const modalIcon = document.getElementById("form-modal-icon");
  const modalMessage = document.getElementById("form-modal-message");
  const modalClose = document.getElementById("form-modal-close");

  function getModalTitle(success) {
    const isEnglish = body.dataset.locale === "en-CA";
    if (success) return isEnglish ? "Message sent" : "Message envoyé";
    return isEnglish ? "Error" : "Erreur";
  }

  function showModal(success, message, options = {}) {
    if (!modal || !modalIcon || !modalMessage) return;
    modal.classList.remove("modal-error", "modal-phone", "modal-success");
    modal.classList.toggle("modal-phone", options.variant === "phone");
    modal.classList.add(success ? "modal-success" : "modal-error");
    modalIcon.textContent = "";
    if (options.variant === "phone") {
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "modal-phone-icon");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", MDI_PHONE_IN_TALK_OUTLINE_PATH);
      icon.appendChild(path);

      const number = document.createElement("span");
      number.textContent = options.title || "";
      modalIcon.append(icon, number);
    } else {
      modalIcon.textContent = options.title || getModalTitle(success);
    }
    modalMessage.textContent = message;
    modal.classList.remove("hidden");
    body.classList.add("overflow-hidden");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    body.classList.remove("overflow-hidden");
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function isMobileDialerLikely() {
    const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return coarsePointer || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  }

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.addEventListener("click", async (event) => {
      if (isMobileDialerLikely()) return;

      event.preventDefault();
      const phone = link.dataset.phoneNumber || link.textContent.trim();
      const isEnglish = body.dataset.locale === "en-CA";
      const message = isEnglish
        ? "Use this number to call Melkior from your phone. It was copied if your browser allows it."
        : "Utilisez ce numéro pour appeler Melkior depuis votre téléphone. Il a été copié si votre navigateur le permet.";

      try {
        if (window.navigator.clipboard) await window.navigator.clipboard.writeText(phone);
      } catch {
        // Clipboard access is optional; the modal still gives the visitor the number.
      }

      showModal(true, message, {
        title: phone,
        variant: "phone",
      });
    });
  });

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const submit = contactForm.querySelector('button[type="submit"]');
    const originalText = submit ? submit.textContent : "";
    const isEnglishForm = contactForm.dataset.locale === "en-CA";
    const messages = {
      sending: contactForm.dataset.sending || "Sending...",
      success: contactForm.dataset.success || "Message sent.",
      error: contactForm.dataset.error || "An error occurred.",
      network: contactForm.dataset.networkError || "Connection error.",
    };
    const validationMessages = isEnglishForm
      ? {
          name: "Enter your full name.",
          email: "Enter your email address.",
          emailInvalid: "Enter a valid email address.",
          phone: "Enter your phone number.",
          subject: "Select a subject.",
          message: "Write a short message.",
          turnstile: "Complete the verification before sending.",
        }
      : {
          name: "Entrez votre nom complet.",
          email: "Entrez votre courriel.",
          emailInvalid: "Entrez une adresse courriel valide.",
          phone: "Entrez votre numéro de téléphone.",
          subject: "Sélectionnez un sujet.",
          message: "Écrivez un court message.",
          turnstile: "Complétez la vérification avant d'envoyer.",
        };
    const validationFields = ["name", "email", "phone", "subject", "message"]
      .map((name) => contactForm.elements[name])
      .filter(Boolean);
    const formStatus = document.createElement("p");
    formStatus.className = "form-status";
    formStatus.setAttribute("role", "alert");
    formStatus.hidden = true;
    if (submit) submit.before(formStatus);

    function getFieldError(field) {
      const group = field.closest(".form-group");
      if (!group) return null;
      let error = group.querySelector(".form-error");
      if (!error) {
        error = document.createElement("span");
        error.className = "form-error";
        error.id = `${field.name}-error`;
        error.setAttribute("role", "alert");
        error.hidden = true;
        group.append(error);
      }
      return error;
    }

    function setFieldError(field, message) {
      const group = field.closest(".form-group");
      const error = getFieldError(field);
      if (!error) return;
      group.classList.add("has-error");
      field.setAttribute("aria-invalid", "true");
      const describedBy = field.getAttribute("aria-describedby") || "";
      if (!describedBy.split(/\s+/).includes(error.id)) {
        field.setAttribute("aria-describedby", `${describedBy} ${error.id}`.trim());
      }
      error.textContent = message;
      error.hidden = false;
    }

    function clearFieldError(field) {
      const group = field.closest(".form-group");
      const error = group ? group.querySelector(".form-error") : null;
      if (group) group.classList.remove("has-error");
      field.removeAttribute("aria-invalid");
      if (error) {
        const describedBy = (field.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter((id) => id && id !== error.id)
          .join(" ");
        if (describedBy) field.setAttribute("aria-describedby", describedBy);
        else field.removeAttribute("aria-describedby");
        error.textContent = "";
        error.hidden = true;
      }
    }

    function getFieldValidationMessage(field) {
      const value = field.value.trim();
      if (field.required && !value) return validationMessages[field.name] || messages.error;
      if (field.name === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return validationMessages.emailInvalid;
      }
      return "";
    }

    function validateField(field) {
      const message = getFieldValidationMessage(field);
      if (message) {
        setFieldError(field, message);
        return false;
      }
      clearFieldError(field);
      return true;
    }

    function setFormStatus(message) {
      formStatus.textContent = message || "";
      formStatus.hidden = !message;
    }

    function clearInlineErrors() {
      validationFields.forEach(clearFieldError);
      setFormStatus("");
    }

    function validateContactForm() {
      let firstInvalid = null;
      setFormStatus("");
      validationFields.forEach((field) => {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });
      return firstInvalid;
    }

    function getTurnstileToken() {
      const turnstileInput = contactForm.querySelector('input[name="cf-turnstile-response"]');
      if (turnstileInput && turnstileInput.value) return turnstileInput.value;
      if (window.turnstile && typeof window.turnstile.getResponse === "function") {
        return window.turnstile.getResponse() || "";
      }
      return "";
    }

    function focusInvalidControl(control) {
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleSubmitError(message) {
      const lower = String(message || "").toLowerCase();
      let fieldName = "";
      if (lower.includes("name") || lower.includes("nom")) fieldName = "name";
      else if (lower.includes("email") || lower.includes("courriel")) fieldName = "email";
      else if (lower.includes("phone") || lower.includes("telephone") || lower.includes("téléphone")) fieldName = "phone";
      else if (lower.includes("subject") || lower.includes("sujet")) fieldName = "subject";
      else if (lower.includes("message")) fieldName = "message";

      if (fieldName && contactForm.elements[fieldName]) {
        setFieldError(contactForm.elements[fieldName], message);
        focusInvalidControl(contactForm.elements[fieldName]);
      } else {
        setFormStatus(message || messages.error);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    validationFields.forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, () => {
        setFormStatus("");
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      if (data.bot_field) {
        showModal(true, messages.success);
        contactForm.reset();
        return;
      }

      const firstInvalid = validateContactForm();
      if (firstInvalid) {
        focusInvalidControl(firstInvalid);
        return;
      }

      const token = getTurnstileToken();
      if (token) data.turnstileToken = token;
      else {
        setFormStatus(validationMessages.turnstile);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = messages.sending;
      }

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          showModal(true, result.message || messages.success);
          contactForm.reset();
          clearInlineErrors();
          if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
        } else {
          handleSubmitError(result.error || messages.error);
        }
      } catch {
        setFormStatus(messages.network);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText;
        }
      }
    });
  }

  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  if ("IntersectionObserver" in window && revealElements.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("revealed"));
  }
});
