import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export class AIAssistant {
    constructor() {
        this.containerId = 'ai-assistant-container';
        this.isOpen = false;
        this.scenesData = [];
        
        // Knowledge base of facts
        this.knowledgeBase = [
            { keywords: ['tour', 'start', 'explore', 'walk', 'see'], response: 'I can start an automatic virtual tour for you! Just click the "Auto Virtual Tour" button on the home page or press (A) in the viewer.', action: 'tour' },
            { keywords: ['library', 'books', 'reading'], response: 'The Central Library is located in the Main Campus building. It contains over 100,000 volumes and modern quiet study spaces.' },
            { keywords: ['food', 'cafeteria', 'canteen', 'eat', 'hungry'], response: 'We have two main cafeterias: The North Campus Cafe and the Student Union Food Court. Both serve hot meals and snacks from 8 AM to 8 PM.' },
            { keywords: ['hostel', 'dorm', 'accommodation', 'live', 'stay'], response: 'The campus offers 5 modern residence halls. They are fully equipped with Wi-Fi, common rooms, and gym facilities.' },
            { keywords: ['sports', 'gym', 'stadium', 'play'], response: 'Our sports complex includes an Olympic-size swimming pool, an indoor gymnasium, and a large outdoor stadium for football and cricket.' },
            { keywords: ['lab', 'computer', 'science', 'research'], response: 'Our departments have state-of-the-art laboratories. You can explore them by navigating to the Departments section and looking for the "Labs" category.' },
            { keywords: ['hi', 'hello', 'hey', 'greetings'], response: 'Hello! I am your Vision 360 AI Assistant. I can tell you about the campus or guide you. What would you like to know?' },
            { keywords: ['who', 'what', 'vision 360', 'vision'], response: 'Vision 360 is a virtual campus exploration platform that lets you take 360° tours of our beautiful campus.' }
        ];

        this.initDOM();
        this.setupListeners();
        this.fetchScenes();
        this.setupSpeechRecognition();
    }

    async fetchScenes() {
        try {
            const snap = await getDocs(collection(db, "scenes"));
            snap.forEach(doc => {
                this.scenesData.push({ id: doc.id, ...doc.data() });
            });
        } catch (e) {
            console.error("Failed to fetch scenes for AI:", e);
        }
    }

    initDOM() {
        if (document.getElementById(this.containerId)) return;

        const container = document.createElement('div');
        container.id = this.containerId;
        container.innerHTML = `
            <div id="ai-chat-window" class="ai-chat-window">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <img src="images/ai_avatar.png" class="ai-avatar-img" alt="AI Avatar"> AI Guide
                    </div>
                    <button id="ai-chat-close"><i class="fas fa-times"></i></button>
                </div>
                <div id="ai-chat-messages" class="ai-chat-messages">
                    <div class="ai-msg bot">hey, i am IRA your virtual tour assistant. welcome to R.N.G.P.I.T!</div>
                </div>
                <div class="ai-chat-input-area">
                    <button id="ai-chat-mic" title="Speak"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="ai-chat-input" placeholder="Ask a question..." autocomplete="off">
                    <button id="ai-chat-send" title="Send"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            <button id="ai-fab" class="ai-fab" title="AI Assistant"></button>
        `;
        document.body.appendChild(container);

        this.chatWindow = document.getElementById('ai-chat-window');
        this.chatMessages = document.getElementById('ai-chat-messages');
        this.chatInput = document.getElementById('ai-chat-input');
        this.fab = document.getElementById('ai-fab');
        this.closeBtn = document.getElementById('ai-chat-close');
        this.sendBtn = document.getElementById('ai-chat-send');
        this.micBtn = document.getElementById('ai-chat-mic');
    }

    setupListeners() {
        this.fab.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat());
        
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.micBtn.addEventListener('click', () => this.toggleSpeechRecognition());
        
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (this.micBtn) this.micBtn.style.display = 'none';
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.isListening = false;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.micBtn.classList.add('recording');
            this.chatInput.placeholder = "Listening...";
        };

        this.recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            this.chatInput.value = text;
            this.handleSend();
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    toggleSpeechRecognition() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    stopListening() {
        this.isListening = false;
        this.micBtn.classList.remove('recording');
        this.chatInput.placeholder = "Ask a question...";
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.chatWindow.classList.add('open');
            this.fab.classList.add('active');
            
            // Speak greeting
            setTimeout(() => {
                this.speak("hey, i am IRA your virtual tour assistant");
                setTimeout(() => this.speak("welcome to R.N.G.P.I.T"), 2500);
                this.chatInput.focus();
            }, 500);
        } else {
            this.chatWindow.classList.remove('open');
            this.fab.classList.remove('active');
        }
    }

    addMessage(text, sender, isHtml = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-msg ${sender}`;
        if (isHtml) {
            msgDiv.innerHTML = text;
        } else {
            msgDiv.textContent = text;
        }
        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Optionally speak bot responses
        if (sender === 'bot' && !isHtml) {
            this.speak(text);
        }
    }

    speak(text) {
        if (!window.speechSynthesis) return;
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.1; // Slightly higher/feminine
        
        window.speechSynthesis.speak(utterance);
    }

    handleSend() {
        const text = this.chatInput.value.trim();
        if (!text) return;
        
        this.addMessage(text, 'user');
        this.chatInput.value = '';

        // Add a typing indicator delay for more organic feel
        setTimeout(() => this.processQuery(text.toLowerCase()), 600);
    }

    processQuery(query) {
        const cleanQuery = query.toLowerCase().trim();
        
        const navPrefixes = ["take me to", "navigate to", "go to", "show me", "where is", "where are", "find", "search"];
        let isNavCommand = false;
        let placeName = "";
        
        for (const prefix of navPrefixes) {
            if (cleanQuery.startsWith(prefix) || cleanQuery.includes(" " + prefix + " ")) {
                isNavCommand = true;
                const idx = cleanQuery.indexOf(prefix);
                placeName = cleanQuery.substring(idx + prefix.length).replace(/\bthe\b/g, "").replace(/\ba\b/g, "").trim();
                break;
            }
        }

        if (!isNavCommand && cleanQuery.length > 2) {
            placeName = cleanQuery;
        }

        let matchedScenes = [];
        if (placeName && this.scenesData.length > 0) {
            matchedScenes = this.scenesData.filter(scene => {
                const titleMatch = scene.title && scene.title.toLowerCase().includes(placeName);
                const typeMatch = scene.sceneType && scene.sceneType.toLowerCase() === placeName;
                return titleMatch || typeMatch;
            });
        }

        // 1. Explicit nav command
        if (isNavCommand) {
            if (matchedScenes.length === 1 && !cleanQuery.includes("where")) {
                const foundScene = matchedScenes[0];
                this.addMessage(`Absolutely! Navigating you to ${foundScene.title} now...`, 'bot');
                setTimeout(() => {
                    if (window.__v360viewer) {
                        window.__v360viewer.loadScene(foundScene.id);
                        this.toggleChat(); // Close chat
                    } else {
                        window.location.href = `viewer.html?scene=${foundScene.id}`;
                    }
                }, 1500);
                return;
            } else if (matchedScenes.length > 0) {
                this.showSuggestions(placeName, matchedScenes);
                return;
            } else if (placeName) {
                this.addMessage(`I couldn't find a scene matching "${placeName}". Could you try being more specific?`, 'bot');
                return;
            }
        }

        // 2. Knowledge Base match
        let bestMatchScore = 0;

        for (const item of this.knowledgeBase) {
            let score = 0;
            for (const keyword of item.keywords) {
                if (query.includes(keyword)) {
                    score++;
                }
            }
            if (score > bestMatchScore) {
                bestMatchScore = score;
                matchedResponse = item.response;
            }
        }

        if (bestMatchScore > 0) {
            this.addMessage(matchedResponse, 'bot');
            return;
        }

        // 3. Fallback to scene search if they just typed a noun
        if (matchedScenes.length > 0 && placeName.length > 2) {
            this.showSuggestions(placeName, matchedScenes);
            return;
        }

        // 4. Default Answer
        this.addMessage("I'm not sure about that. Try asking me about hostels, food, or say 'Take me to a classroom'.", 'bot');
    }

    showSuggestions(placeName, matchedScenes) {
        let htmlResponse = `I found ${matchedScenes.length} place(s) matching "<b>${placeName}</b>":<br><br>`;
        htmlResponse += `<div style="display:flex; flex-direction:column; gap:10px;">`;
        const suggestions = matchedScenes.slice(0, 5);
        suggestions.forEach(scene => {
            const oc = `if(window.__v360viewer){ window.__v360viewer.loadScene('${scene.id}'); document.getElementById('ai-chat-window').classList.remove('open'); document.getElementById('ai-fab').classList.remove('active'); return false; }`;
            htmlResponse += `<a href="viewer.html?scene=${scene.id}" onclick="${oc}" style="color:var(--text-main); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px; border:1px solid var(--glass-border);">` +
                            `<i class="fas fa-location-arrow" style="color:#f093fb;"></i> ${scene.title}</a>`;
        });
        if (matchedScenes.length > 5) {
            htmlResponse += `<span style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">...and ${matchedScenes.length - 5} more.</span>`;
        }
        htmlResponse += `</div>`;
        this.addMessage(htmlResponse, 'bot', true);
    }
}
