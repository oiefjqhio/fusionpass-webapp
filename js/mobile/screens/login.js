import { AuthManager } from "../../core/auth/authManager.js";
import { $, esc } from "../dom.js";

const friendly = (error) => {
  const m = String(error?.message || error || "").toLowerCase();
  if (m.includes("invalid") || m.includes("credentials")) return "That email and password don't match a pass.";
  if (m.includes("network") || m.includes("fetch")) return "Can't reach the server. Check your connection.";
  return "Couldn't sign in. Try again.";
};

export function renderLogin(screen) {
  screen.classList.add("no-tabs");
  screen.innerHTML = `
    <form class="fp-login" novalidate>
      <img class="logo" src="assets/brand/app_icon.png" alt="">
      <h1>Welcome back</h1>
      <p>Sign in with the email and password from your pass.</p>
      <input class="fp-field" type="email" name="email" autocomplete="username" inputmode="email" placeholder="Email" required>
      <input class="fp-field" type="password" name="password" autocomplete="current-password" placeholder="Password" required>
      <div class="fp-error" aria-live="polite"></div>
      <button class="fp-btn is-accent" type="submit">Sign in</button>
      <div class="foot">No pass yet? <a href="https://fusionpass.shop" target="_blank" rel="noopener">Get one at fusionpass.shop</a></div>
    </form>`;
  const form = $(screen, "form");
  const err = $(screen, ".fp-error");
  const btn = $(screen, "button");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      err.textContent = "Enter your email and password.";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Signing in…";
    err.textContent = "";
    try {
      await AuthManager.signInWithEmail(email, password);
    } catch (error) {
      err.innerHTML = esc(friendly(error));
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}
