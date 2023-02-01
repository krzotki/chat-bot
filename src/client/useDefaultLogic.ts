import { useCallback, useMemo, useRef, useState } from "react";

function download(content, fileName, contentType) {
  var a = document.createElement("a");
  var file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

export const useDefaultLogic = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [image, setImage] = useState<{ Location: string }>();
  const fileInputRef = useRef<HTMLInputElement>();
  const jsonFileInputRef = useRef<HTMLInputElement>();

  const loadJsonFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      console.log({file})
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = (evt) => {
        if (!evt.target.result) {
          return;
        }
        const jsonObject = JSON.parse(String(evt.target.result));
        console.log({jsonObject})
        setMessages(jsonObject);
      };
    },
    []
  );

  const uploadImage = useCallback(async (evt) => {
    const files = evt.target.files;
    if (!files.length) {
      return;
    }
    const data = new FormData();
    data.append("name", files[0].name);
    data.append("file", files[0]);

    const imageResponse = await fetch("/api/upload", {
      method: "POST",
      credentials: "same-origin",
      body: data,
    });

    const { image } = await imageResponse.json();

    // const image = {
    //   Location:
    //     "https://krzotki-chatbot-images.s3.eu-central-1.amazonaws.com/1672154559985_Bez%C2%A0tytu%C5%82u.png",
    // };

    setImage(image);
  }, []);

  const saveConversation = useCallback(() => {
    download(
      JSON.stringify(messages, null, 2),
      "conversation.json",
      "text/json"
    );
  }, [messages]);

  const onSubmit = useCallback(
    async function (event, context: "solver" | "thesis") {
      event.preventDefault();

      if (loading || !fileInputRef.current) {
        return;
      }

      const newMessages = [
        ...messages,
        {
          sender: "Human: ",
          message:
            prompt + (image ? `\n ![attachment](${image?.Location})` : ""),
        },
      ];

      setMessages(newMessages);

      const conversation = newMessages.reduce(
        (prev, curr, index) => prev + curr.sender + curr.message + "\n",
        ""
      );

      setPrompt("");
      setLoading(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: conversation,
          attachment: image?.Location,
          context,
        }),
      });

      setImage(undefined);
      fileInputRef.current.value = "";

      setLoading(false);
      const { result } = await response.json();
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "AI: ",
          message: result,
        },
      ]);
    },
    [messages, prompt, loading, image]
  );

  return {
    messages,
    onSubmit,
    loading,
    prompt,
    setPrompt,
    fileInputRef,
    uploadImage,
    saveConversation,
    loadJsonFile,
    jsonFileInputRef,
    image,
  };
};
