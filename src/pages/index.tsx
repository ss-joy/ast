import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Waveform from "@/components/WaveForm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

const AudioRecorderPage = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudios, setRecordedAudios] =
    useState<{ url: string; name: string }[]>();
  const [isUploading, setIsuploading] = useState<boolean>(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [browserSupportForPlaying, setBrowserSupportForPlaying] = useState<
    Record<string, any>
  >({});
  const [browserSupportForRecording, setBrowserSupportForRecording] = useState<
    Record<string, any>
  >({});
  const [mediaRecorderSupported, setMediaRecorderSupported] =
    useState<boolean>(false);
  const [selectedMimeType, setSelectedMimeType] = useState<string>("");

  const getBestSupportedFormat = (): string => {
    if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) {
      return "audio/mp4;codecs=mp4a.40.2";
    } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
      return "audio/mp4";
    }
    const preferredFormats = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mpeg",
      "audio/wav",
    ];

    for (const format of preferredFormats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }

    return "audio/webm"; // fallback
  };

  const getFileExtensionFromMimeType = (mimeType: string): string => {
    const mimeToExtension: Record<string, string> = {
      "audio/webm": "webm",
      "audio/webm;codecs=opus": "webm",
      "audio/ogg": "ogg",
      "audio/ogg;codecs=opus": "ogg",
      "audio/mp4": "m4a",
      "audio/mp4;codecs=mp4a.40.2": "m4a",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/aac": "aac",
    };

    // Remove any codec information for matching
    const baseType = mimeType.split(";")[0];
    return mimeToExtension[mimeType] || mimeToExtension[baseType] || "webm";
  };

  useEffect(() => {
    async function getData() {
      const { data, error } = await supabase.storage
        .from("sei bucket")
        .list("mama", {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });
      const urlList: { url: string; name: string }[] = [];
      data?.forEach((d) => {
        if (d.name === ".emptyFolderPlaceholder") return;
        const { data: pubUrl } = supabase.storage
          .from("sei bucket")
          .getPublicUrl(`mama/${d.name}`);

        urlList.push({ name: d.name, url: pubUrl.publicUrl });
      });
      setRecordedAudios(urlList);
    }
    getData();
  }, [isUploading]);

  useEffect(() => {
    const supportedFormatsForPlaying = {
      wav: testAudioRef.current?.canPlayType("audio/wav"),
      mp3: testAudioRef.current?.canPlayType("audio/mpeg"),
      m4a: testAudioRef.current?.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
      ogg: testAudioRef.current?.canPlayType('audio/ogg; codecs="vorbis"'),
      webm: testAudioRef.current?.canPlayType('audio/webm; codecs="vorbis"'),
      aac: testAudioRef.current?.canPlayType("audio/aac"),
    };

    const supportedFormatsForRecording = {
      wav: MediaRecorder.isTypeSupported("audio/wav"),
      mp3: MediaRecorder.isTypeSupported("audio/mpeg"),
      m4a: MediaRecorder.isTypeSupported("audio/mp4"),
      ogg: MediaRecorder.isTypeSupported("audio/ogg"),
      webm: MediaRecorder.isTypeSupported("audio/webm"),
      aac: MediaRecorder.isTypeSupported("audio/aac"),
    };

    const bestFormat = getBestSupportedFormat();

    setSelectedMimeType(bestFormat);
    setBrowserSupportForPlaying(supportedFormatsForPlaying);
    setBrowserSupportForRecording(supportedFormatsForRecording);
    setMediaRecorderSupported(!!window.MediaRecorder);
  }, []);

  async function startRecording(): Promise<void> {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    setIsRecording(true);
    setAudioUrl(undefined);

    mediaRecorderRef.current = new MediaRecorder(mediaStream, {
      mimeType: selectedMimeType,
    });
    const audioChunks: Blob[] = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      console.log("on data available chunks here =>");
      console.log(e.data);
      audioChunks.push(e.data);
    };

    mediaRecorderRef.current.onstop = (e) => {
      const audioBlob = new Blob(audioChunks, {
        type: selectedMimeType,
      });
      console.log("final combined blob here =>");
      console.log(audioBlob);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setAudioBlob(audioBlob);
    };

    mediaRecorderRef.current.start();
  }

  async function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef?.current?.stream
      .getTracks()
      .forEach((track) => track.stop());

    setIsRecording(false);
  }

  async function playRecordedAudio() {
    audioPlayerRef.current?.play();
  }

  async function uploadAudioToBakend() {
    if (!audioBlob) return;
    setIsuploading(true);
    try {
      const fileExtension = getFileExtensionFromMimeType(selectedMimeType);
      const { data, error } = await supabase.storage
        .from("sei bucket")
        .upload(`mama/${crypto.randomUUID()}.${fileExtension}`, audioBlob);
      setIsuploading(false);
      toast("Successful", {
        description: "Audio uploaded successfully",
      });
      setAudioUrl(undefined);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="py-8">
      <audio src="" ref={testAudioRef}></audio>
      <div className="flex gap-1 w-[80%] mx-auto justify-center my-4">
        <Button
          onClick={() => startRecording()}
          disabled={isRecording || isUploading}
        >
          Start
        </Button>
        <Button
          onClick={() => stopRecording()}
          disabled={!isRecording || isUploading}
        >
          Stop
        </Button>

        <Button
          onClick={() => uploadAudioToBakend()}
          disabled={isRecording || !audioUrl}
        >
          Upload to server
        </Button>
      </div>
      {isRecording ? (
        <div className="text-center animate-pulse my-4">
          Recording.....!!!!! 🎙️🎙️🎙️🎙️
        </div>
      ) : null}

      {isUploading ? (
        <div className="text-center animate-pulse my-4">
          Uploading........!!!!🔼🔼🔼🔼
        </div>
      ) : null}

      {audioUrl ? (
        <Card className="flex items-center justify-center my-4 mx-auto w-[80%] p-4">
          <Waveform audioUrl={audioUrl} />
          <audio
            controls
            src={audioUrl}
            ref={audioPlayerRef}
            onClick={() => playRecordedAudio()}
            className="hidden"
          ></audio>
        </Card>
      ) : null}

      <Card className="p-4 mx-auto w-[80%]">
        <section className="flex flex-col gap-5 mx-auto w-[80%] mt-5 items-center">
          <h1 className="text-center w-full text-3xl font-semibold text-cyan-700">
            Recorded audios
          </h1>
          {recordedAudios?.map((d, index) => (
            <div key={index}>
              <span className="text-slate-500 my-2 block">{d.name}</span>
              <Waveform audioUrl={d.url} />
              <audio
                src={d.url}
                key={index}
                controls
                preload="metadata"
                className="hidden"
              ></audio>
            </div>
          ))}
        </section>
      </Card>
      <Card className="w-[80%] mx-auto my-4 p-4">
        <CardHeader className="text-cyan-700 text-3xl font-bold">
          Browser support
        </CardHeader>
        <CardContent>
          Support for{" "}
          <span className="font-bold text-slate-500">MediaRecorder API</span>:
          {mediaRecorderSupported ? (
            <span className="text-green-700 font-bold"> Available </span>
          ) : (
            <span className="text-red-700">Not Available</span>
          )}
        </CardContent>
      </Card>

      <Card className="w-[80%] mx-auto my-4 p-4">
        <CardHeader>
          <p>
            <span className="uppercase text-orange-500 font-bold">YOUR</span>{" "}
            Browser can{" "}
            <span className="uppercase text-orange-500 font-bold">play</span>{" "}
            the listed audio files formats
          </p>
        </CardHeader>
        <CardContent>
          <div className="break-all">
            {Object.entries(browserSupportForPlaying).map(
              ([format, value], index) => {
                return (
                  <div key={index}>
                    {format} :{" "}
                    {value === ""
                      ? "🔴 NO SUPPORT"
                      : value === "probably"
                      ? "🟢 will play"
                      : value === "maybe"
                      ? "🟡 not enough info"
                      : "🔺Got no info🔺"}
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-[80%] p-4 mx-auto">
        <CardHeader>
          <p>
            <span className="uppercase text-cyan-500 font-bold">YOUR</span>{" "}
            Browser can{" "}
            <span className="uppercase text-cyan-500 font-bold">record</span>{" "}
            the listed audio file formats
          </p>
        </CardHeader>
        <CardDescription className="ml-6 mb-4">
          Currently using: {selectedMimeType} to record audios
        </CardDescription>

        <CardContent>
          <div className="break-all">
            {Object.entries(browserSupportForRecording).map(
              ([key, value], index) => {
                return (
                  <div key={index}>
                    {key} : {value ? "🟢 YES" : "🔴 NO"}
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioRecorderPage;
