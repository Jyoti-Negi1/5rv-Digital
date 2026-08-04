// const btn = document.getElementById("menu-btn");
// const menu = document.getElementById("menu");

// btn.addEventListener("click", () => {
//   menu.classList.toggle("hidden");
// });

document.addEventListener("DOMContentLoaded", () => {
  const faqButtons = document.querySelectorAll(".faq-btn");

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.parentElement;
      const content = item.querySelector(".faq-content");
      const icon = item.querySelector(".faq-icon");

      document.querySelectorAll(".faq-item").forEach((faq) => {
        if (faq !== item) {
          faq.querySelector(".faq-content").classList.add("hidden");
          faq.querySelector(".faq-icon").classList.remove("rotate-180");
        }
      });

      content.classList.toggle("hidden");
      icon.classList.toggle("rotate-180");
    });
  });
});