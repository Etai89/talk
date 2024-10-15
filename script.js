$(document).ready(() => {
    let languageUser = 'he-IL'
    if ($('#lang').text().trim() === 'עברית'){
        languageUser = 'he-IL'
    }else{
        languageUser = 'en-US'
    }


    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageUser;
            window.speechSynthesis.speak(utterance);
        }
    }

    const resultDiv = $('#result');
    const toggleButton = $('#toggle-recognition');
    let silenceTimeout; // Timeout variable for detecting silence

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageUser; // Set the language
    recognition.interimResults = false;
    recognition.continuous = true; // Keep listening continuously

    const TOKEN = 'AIzaSyB4Hka0BMKYNd5tiMCJo5G3qB13oDO40d8';

    toggleButton.mousedown(() => {
        resultDiv.text("מקשיב לך...");
        recognition.start();
        toggleButton.text("תפסיק לדבר");
    });

    toggleButton.mouseup(() => {
        recognition.stop();
        toggleButton.text("התחל לדבר");
    });

    recognition.onresult = async (event) => {
        const speechResult = event.results[event.resultIndex][0].transcript;
        resultDiv.text(`אני: ${speechResult}`);

        // Reset the timeout for silence detection
        clearTimeout(silenceTimeout);

        // Set a longer timeout duration (e.g., 1 minute)
        silenceTimeout = setTimeout(() => {
            recognition.stop();
            toggleButton.text("התחל לדבר");
            resultDiv.append("<br>Listening stopped due to inactivity.");
        }, 60000); // Stop listening after 60 seconds (1 minute) of silence

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${TOKEN}`;

        const requestData = {
            contents: [
                {
                    parts: [
                        { text: speechResult }
                    ]
                }
            ]
        };

        try {
            const response = await $.ajax({
                url: apiEndpoint,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(requestData)
            });
            // Clean the generated content by removing asterisks
            const generatedContent = response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').trim();
            resultDiv.append(`<br>הוא: ${generatedContent}`);
            speakText(generatedContent);
        } catch (error) {
            console.error("Error communicating with Gemini AI Studio:", error);
            resultDiv.append("<br>An error occurred while fetching the response.");
        }
    };


    recognition.onerror = (event) => {
        if (event.error !== "no-speech") {
            resultDiv.text("Error occurred: " + event.error);
        }
    };

    recognition.onend = () => {
        // Optionally, handle any end of recognition logic here
        // but it won't be used in this version
    };
});