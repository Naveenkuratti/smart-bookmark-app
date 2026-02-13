"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Bookmark = {
  id: string
  title: string
  url: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(true)

  // Check user
  useEffect(() => {
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function getUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)

    if (data.user) {
      fetchBookmarks()
    }

    setLoading(false)
  }

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setBookmarks([])
  }

  async function fetchBookmarks() {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setBookmarks(data || [])
    } else {
      console.log("Fetch error:", error)
    }
  }

  async function addBookmark() {
    if (!title || !url) return

    const { error } = await supabase.from("bookmarks").insert([
      {
        title,
        url,
        user_id: user.id,
      },
    ])

    if (error) {
      console.log("Insert error:", error)
    } else {
      setTitle("")
      setUrl("")
      fetchBookmarks()
    }
  }

  async function deleteBookmark(id: string) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)

    if (error) {
      console.log("Delete error:", error)
    } else {
      fetchBookmarks()
    }
  }

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bookmarks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        () => {
          fetchBookmarks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <div className="p-10">Loading...</div>

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button
          onClick={login}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          Login with Google
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">My Bookmarks</h1>
        <button onClick={logout} className="text-red-500">
          Logout
        </button>
      </div>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
      />

      <input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
      />

      <button
        onClick={addBookmark}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-6 hover:bg-blue-700"
      >
        Add Bookmark
      </button>

      <div className="space-y-3">
        {bookmarks.map((b) => (
          <div
            key={b.id}
            className="border p-3 flex justify-between items-center rounded"
          >
            <a
              href={b.url}
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              {b.title}
            </a>
            <button
              onClick={() => deleteBookmark(b.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
