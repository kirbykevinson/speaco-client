class Chat {
	join() {
		document.querySelector(".registration").hidden = true;
		document.querySelector(".chat").hidden = false;
	}
	
	send() {
		
	}
}

window.chat = new Chat();
