const stripe = Stripe(key);

document.addEventListener("DOMContentLoaded", () => {
	const btnWrap = document.getElementById("btn-wrap");
	const stripeSection = document.getElementById("stripe-section");
	const backBtn = document.getElementById("back-to-plans");
	const paymentElementContainer = document.getElementById("card-element");
	const cardWrapper = document.getElementById("card-wrapper");
	const errorDiv = document.getElementById("card-errors");

	let currentIntentId = null;
	let elements = null;

	/** Plan */ {
		let selectedPlan = 5;

		const planPaymentBtn = document.getElementById("plan-payment-btn");
		const leftSide = document.getElementById("left-side");
		const planInputs = document.querySelectorAll('input[name="plan"]');

		planInputs.forEach((input) => {
			input.addEventListener("change", () => {
				const planCard = input.nextElementSibling;
				const hiddenInput = planCard.querySelector(
					'input[type="number"]',
				);
				selectedPlan = Number(hiddenInput.value.trim());
				console.log("Selected plan updated:", selectedPlan);
			});
		});
		  
		planPaymentBtn?.addEventListener("click", async () => {
			leftSide.classList.add("hidden");
			btnWrap.classList.add("hidden");
			cardWrapper.classList.add("hidden");
			stripeSection.classList.remove("hidden");
			console.log(document.getElementById("stripe-section"));

			try {
				await initializeOrUpdateIntent(selectedPlan, "plan");

				cardWrapper.classList.remove("hidden");
			} catch (err) {
				btnWrap.classList.remove("hidden");
				leftSide.classList.remove("hidden");
				console.error(err?.message || err);
				toast(
					"error",
					"Payment setup failed: " +
						(err?.message || err || "Try again"),
				);
			}

			backBtn?.addEventListener("click", () => {
				stripeSection.classList.add("hidden");
				leftSide.classList.remove("hidden");
				btnWrap.classList.remove("hidden");
				backBtn?.removeEventListener("click");
			});
		});
	}

	/** Messages */ {
		let selectedMessages = 5000;

		const stripeBtn = document.getElementById("btn");
		const rightSide = document.getElementById("right-side");
		const planInputs = document.querySelectorAll('input[name="credits"]');

		planInputs.forEach((input) => {
			input.addEventListener("change", () => {
				const planCard = input.nextElementSibling;
				selectedPlan = Number(
					planCard.querySelector("input").value.trim(),
				);
			});
		});

		stripeBtn?.addEventListener("click", async () => {
			rightSide.classList.add("hidden");
			btnWrap.classList.add("hidden");
			stripeSection.classList.remove("hidden");
			cardWrapper.classList.add("hidden");

			try {
				await initializeOrUpdateIntent(selectedMessages, "credits");

				cardWrapper.classList.remove("hidden");
			} catch (err) {
				stripeSection.classList.add("hidden");
				btnWrap.classList.remove("hidden");
				rightSide.classList.remove("hidden");
				console.error(err?.message || err);
				toast(
					"error",
					"Payment setup failed: " +
						(err?.message || err || "Try again"),
				);
			}

			backBtn?.addEventListener("click", () => {
				stripeSection.classList.add("hidden");
				rightSide.classList.remove("hidden");
				btnWrap.classList.remove("hidden");
				backBtn?.removeEventListener("click");
			});
		});

		
	}

	async function initializeOrUpdateIntent(messages, type) {
		errorDiv.textContent = "";

		const res = await fetch("/api/settings/create-payment-intent", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages,
				intentId: currentIntentId,
				type,
			}),
		});

		const { clientSecret, intentId, success, message } = await res.json();

		if (!success) throw message;

		currentIntentId = intentId;

		const appearance = {
			labels: "floating",
			variables: {
				fontFamily: "Figtree, sans-serif",
				fontSizeBase: "14px",
				fontLineHeight: "1.5",
				borderRadius: "0.5rem",
				colorPrimary: "#6b7280",
				colorText: "#6b7280",
				colorTextPlaceholder: "#d1d5db",
				fontSmooth: "always",
			},
			rules: {
				".Block": {
					boxShadow: "none",
					padding: "0.5rem",
					borderRadius: "0.5rem",
				},
				".Input": {
					padding: "0.5rem",
					color: "#6b7280",
					borderRadius: "0.5rem",
					outline: "none",
					boxShadow: "none",
				},
				".Input:focus": {
					border: "1px solid black",
					outline: "none",
					boxShadow: "none",
				},
				".Input::placeholder": {
					color: "#9ca3af",
				},
				".Input:disabled, .Input--invalid:disabled": {
					color: "#9ca3af",
				},
				".Tab": {
					padding: "0.5rem",
					borderRadius: "0.5rem",
					border: "1px solid transparent",
					color: "#6b7280",
				},
				".Tab:hover": {
					border: "1px solid #6b7280",
					backgroundColor: "#fef2f2",
				},
				".Tab--selected, .Tab--selected:focus, .Tab--selected:hover": {
					borderBottom: "1px solid black",
					backgroundColor: "#fff",
					boxShadow: "0",
					color: "#ef4444",
				},
				".Label": {
					fontWeight: "500",
					color: "#6b7280",
				},
			},
		};

		elements = stripe.elements({
			clientSecret,
			appearance,
			fonts: [
				{
					cssSrc: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap",
				},
			],
		});

		paymentElementContainer.innerHTML = "";

		const paymentElement = elements.create("payment", {
			layout: "auto",
			defaultValues: {
				billingDetails: {
					name: name || "",
					email: email || "",
					phone: contact || "",
				},
			},
		});
		paymentElement.mount("#card-element");

		addSubmitButton();
	}

	function addSubmitButton() {
		if (document.getElementById("submit")) return;

		const btn = document.createElement("button");
		btn.id = "submit";
		btn.className =
			"my-6 w-full bg-black text-white rounded-lg py-2 text-center font-semibold flex justify-center items-center";

		btn.innerHTML = `
	<span id="button-text">Pay</span>
	<div id="spinner" class="loading-spinner ml-2 hidden w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
	`;

		btn.addEventListener("click", handleSubmit);
		stripeSection.appendChild(btn);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${url}/settings/confirm-stripe-payment`,
			},
		});

		if (
			error?.type === "card_error" ||
			error?.type === "validation_error"
		) {
			showMessage(error.message);
		} else {
			showMessage("An unexpected error occurred.");
		}

		setLoading(false);
	}

	function showMessage(msg) {
		let el = document.getElementById("payment-message");
		if (!el) {
			el = document.createElement("div");
			el.id = "payment-message";
			el.className = "text-sm text-red-600 mt-4 text-center";
			stripeSection.appendChild(el);
		}
		el.textContent = msg;
		el.classList.remove("hidden");
		setTimeout(() => el.classList.add("hidden"), 4000);
	}

	function setLoading(isLoading) {
		const btn = document.getElementById("submit");
		if (!btn) return;

		btn.disabled = isLoading;

		const spinner = btn.querySelector("#spinner");
		const text = btn.querySelector("#button-text");

		spinner.classList.toggle("hidden", !isLoading);
		text.classList.toggle("hidden", isLoading);
	}
});
