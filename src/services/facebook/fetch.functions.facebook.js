import dotenv from "dotenv";
dotenv.config();

export async function fetchWabaInfo(wabaId, token, ...fields) {
	if (!wabaId || !token) throw "wabaId and token are required";

	const fieldParams = fields.length ? fields.join(",") : "currency";
	const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${wabaId}?fields=${fieldParams}&access_token=${token}`;

	const res = await fetch(url);
	const body = await res.json();

	if (!res.ok) {
		throw new Error(body.error?.message || "Unknown error");
	}

	return body;
}

export async function changeNumberDP({
	phoneNumberId,
	token,
	about,
	address,
	description,
	email,
	vertical,
	websites,
	profilePictureHandle,
}) {
	if (!phoneNumberId || !token) {
		throw new Error("phoneNumberId and token are required");
	}

	const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/whatsapp_business_profile`;

	const payload = {
		messaging_product: "whatsapp",
	};

	// Add optional fields only if they are valid
	if (about?.trim()) payload.about = about;
	if (address?.trim()) payload.address = address;
	if (description?.trim()) payload.description = description;
	if (email?.trim()) payload.email = email;
	if (vertical !== undefined) payload.vertical = vertical;
	if (Array.isArray(websites) && websites.length > 0)
		payload.websites = websites;
	if (profilePictureHandle?.trim())
		payload.profile_picture_handle = profilePictureHandle;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});

	const body = await res.json();

	if (!res.ok) {
		throw new Error(
			body.error?.message || "Unknown error from WhatsApp API",
		);
	}

	return body; // { success: true }
}  
