class Chat {
	constructor() {
		this.elements = {
			registration: document.querySelector(".registration"),
			chat: document.querySelector(".chat"),
			
			serverIp: document.querySelector("#server-ip"),
			nickname: document.querySelector("#nickname"),
			
			messages: document.querySelector(".messages"),
			message: document.querySelector("#message"),
		};
		
		this.serverIp = null;
		this.nickname = null;
	}
	
	join() {
		this.serverIp =
			this.elements.serverIp.value ||
			this.elements.serverIp.placeholder;
		this.nickname =
			this.elements.nickname.value ||
			this.elements.nickname.placeholder;
		
		this.elements.registration.hidden = true;
		this.elements.chat.hidden = false;
	}
	
	sendMessage() {
		this.recieveMessage(this.nickname, this.elements.message.value);
		
		this.elements.message.value = "";
	}
	
	recieveMessage(sender, message) {
		const container = document.createElement("p");
		
		container.className = "message";
		
		const senderName = document.createElement("span");
		
		senderName.className = "sender";
		senderName.innerText = sender;
		
		container.appendChild(senderName);
		
		const text = document.createTextNode(message);
		
		container.appendChild(text);
		
		this.elements.messages.appendChild(container);
	}
}

window.chat = new Chat();
