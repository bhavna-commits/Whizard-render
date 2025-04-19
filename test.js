import { getMediaUrl } from "./src/controllers/Chats/chats.functions.js";

const token =
	"EAAmWdWtcPz4BOxPQe3cbk22vFqscMzSE6OaDLX19dbkDnS10jcSTrpPwTh97pUAPYqTVMUirUPmnObieSBVY1svWQFMFeeVnFb6qsi69FdKJZB9JpDsZANkhVwenQ2mmcevr1M883XFITtb1eQSQtwbnJcS05RXa5ULqHTAJZAGDZAxkzsGjMubp";

const mediaId = "696280686155122";

async function name(params) {
    const { url } = await getMediaUrl(token, mediaId);
    console.log(url);
}

name();