const stripe = Stripe(
	"pk_test_51RisfVPXXM07qeUBQiIX88g2vQuFP0tMls2YDyb7rHMaFJJT6Vu2ULAxYQl28DcDP7I0eYHPS5YyanOYGdo49WNd00XG3oHThu",
);

document.addEventListener("DOMContentLoaded", () => {
	const stripeBtn = document.getElementById("btn");
	const rightSide = document.getElementById("right-side");
	const btnWrap = document.getElementById("btn-wrap");
	const stripeSection = document.getElementById("stripe-section");
	const backBtn = document.getElementById("back-to-plans");
	const planInputs = document.querySelectorAll('input[name="plan"]');
	const planTitle = document.getElementById("payment-plan-title");
	const paymentElementContainer = document.getElementById("card-element");
	const stripePaymentBox = document.getElementById("stripe-payment-box");
	const cardWrapper = document.getElementById("card-wrapper");
	const errorDiv = document.getElementById("card-errors");
	const titleHead = document.getElementById("titleHead");

	let selectedAmount = 500;
	let selectedMessages = 5000;
	let currentIntentId = null;
	let elements = null;

	planInputs.forEach((input) => {
		input.addEventListener("change", () => {
			const planCard = input.nextElementSibling;
			const priceText = planCard
				.querySelector(".text-xl")
				.textContent.trim();
			const messageText = planCard.querySelector("h3").textContent.trim();

			selectedAmount = priceText.replace(currencyTag, "");
			selectedMessages = Number(messageText.replace(" Messages", ""));

			planTitle.innerText = `You chose: ${selectedMessages} Messages – ${currencyTag} ${selectedAmount}`;
			titleHead.innerText = `${selectedMessages} Messages for ${currencyTag} ${selectedAmount}`;
		});
	});

	stripeBtn?.addEventListener("click", async () => {
		rightSide.classList.add("hidden");
		btnWrap.classList.add("hidden");
		stripeSection.classList.remove("hidden");

		stripePaymentBox.classList.add("hidden");
		cardWrapper.classList.add("hidden");

		try {
			await initializeOrUpdateIntent(selectedMessages);

			stripePaymentBox.classList.remove("hidden");
			cardWrapper.classList.remove("hidden");
		} catch (err) {
			stripeSection.classList.add("hidden");
			btnWrap.classList.remove("hidden");
			rightSide.classList.remove("hidden");
			console.error(err?.message || err);
			toast(
				"error",
				"Payment setup failed: " + (err?.message || err || "Try again"),
			);
		}
	});

	backBtn?.addEventListener("click", () => {
		stripeSection.classList.add("hidden");
		rightSide.classList.remove("hidden");
		btnWrap.classList.remove("hidden");
	});

	async function initializeOrUpdateIntent(messages) {
		errorDiv.textContent = "";

		const res = await fetch("/api/settings/create-payment-intent", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages, intentId: currentIntentId }),
		});

		const { clientSecret, intentId, success, message } = await res.json();

		if (!success) throw message;

		currentIntentId = intentId;
		currentClientSecret = clientSecret;

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

		const paymentElement = elements.create("payment", { layout: "tabs" });
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
