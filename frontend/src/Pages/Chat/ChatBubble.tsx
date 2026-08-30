// Import files
import './Chat.css';

export interface ChatAction {
    id: string;
    label: string;
    onSelect: () => void;
}

export interface ChatMessage {
    id: string;
    role: 'ai' | 'user';
    text: string;
    actions? : ChatAction[]; // approval buttons for the user
    isThinking?: boolean;
}

interface ChatBubbleProps {
    message: ChatMessage;
}

export default function ChatBubble({ message } : ChatBubbleProps) {
    const isAiSpeaking = message.role == "ai";

    return (
        <div className = {`chatRow ${isAiSpeaking ? 'aiMsgFormat' : 'userMsgFormat'}`}>
            <div className={`chatBubble ${isAiSpeaking ? 'aiChatBubble' : 'userChatBubble'}`}>
                {message.isThinking ? (
                    <span className="chatThinkingAnim">
                        <span></span><span></span><span></span>
                    </span>
                    ) : (
                    <p className="chatText">{message.text}</p>
                )}

                {message.actions && message.actions.length > 0 && (
                    <div className="chatActions">
                        {message.actions.map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            className="chatActionButton"
                            onClick={action.onSelect}
                        >
                            {action.label}
                        </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}