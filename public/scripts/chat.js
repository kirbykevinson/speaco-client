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
		
		this.socket = null;
	}
	
	error(message, error) {
		alert("Error: " + message);
		
		this.close();
	}
	
	open() {
		this.elements.registration.hidden = true;
		this.elements.chat.hidden = false;
	}
	close() {
		if (this.socket) {
			if (this.socket.readyState != WebSocket.CLOSED) {
				this.socket.close();
			}
			
			this.socket = null;
		}
		
		this.elements.registration.hidden = false;
		this.elements.chat.hidden = true;
	}
	
	join() {
		if (this.socket) {
			this.error("already connected");
			
			return;
		}
		
		this.serverIp =
			this.elements.serverIp.value ||
			this.elements.serverIp.placeholder;
		this.nickname =
			this.elements.nickname.value ||
			this.elements.nickname.placeholder;
		
		this.socket = new WebSocket("ws://" + this.serverIp);
		
		this.socket.addEventListener("error", (event) => {
			this.error("couldn't connect to the server");
		});
		this.socket.addEventListener("close", (event) => {
			this.close();
		});
		
		this.socket.addEventListener("open", (event) => {
			this.sendEvent("join", {
				nickname: this.nickname
			});
		});
		
		this.socket.addEventListener("message", (event) => {
			let parsedEvent = null;
			
			try {
				parsedEvent = JSON.parse(event.data);
			} catch (error) {
				this.error("malformed event");
				
				console.log(event.data);
				
				return;
			}
			
			if (!parsedEvent || typeof parsedEvent != "object") {
				this.error("event is not an object");
				
				return;
			}
			
			if (!("type" in parsedEvent)) {
				this.error("event without a type");
				
				return;
			}
			
			this.recieveEvent(parsedEvent);
		});
	}
	
	sendEvent(type, data) {
		if (!data || typeof data != "object") {
			throw new TypeError("event data must be an object");
		}
		
		data.type = type;
		
		this.socket.send(JSON.stringify(data));
	}
	recieveEvent(event) {
		switch (event.type) {
		case "welcome":
			this.open();
			
			break;
		case "bye":
			alert("You've been kicked");
			
			this.close();
			
			break;
		case "error":
			this.error(event.message);
			
			break;
		default:
			this.error("illegal event type");
			
			console.log(event);
			
			break;
		}
	}
	
	sendMessage() {
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
