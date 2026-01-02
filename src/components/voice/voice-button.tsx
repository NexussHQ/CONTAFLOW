"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function VoiceButton({ onCommand }: { onCommand: (command: string) => void }) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setIsSupported(true)
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.lang = 'es-ES'
      recognition.interimResults = false

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          onCommand(transcript.toLowerCase())
        }
      }

      recognition.onerror = () => setIsListening(false)

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onCommand])

  const handleVoiceClick = () => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "No compatible",
        description: "Tu navegador no soporta reconocimiento de voz",
      })
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      recognitionRef.current?.start()
    }
  }

  return (
    <Button
      size="icon"
      className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}
      onClick={handleVoiceClick}
    >
      {isListening ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="sr-only">Escuchando...</span>
        </>
      ) : isSupported ? (
        <>
          <Mic className="h-6 w-6" />
          <span className="sr-only">Activar voz</span>
        </>
      ) : (
        <>
          <MicOff className="h-6 w-6" />
          <span className="sr-only">Voz no disponible</span>
        </>
      )}
    </Button>
  )
}
