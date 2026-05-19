'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Feed {
  id: number;
  message: string;
  created_at: string;
}

export default function Home() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const socketRef = useRef<any>(null);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/feed`);
      setFeeds(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch feeds');
      console.error('Error fetching feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();

    // Setup Socket.IO client for realtime updates
    let mounted = true;
    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socketUrl = apiUrl || 'http://localhost:3000';
        const socket = io(socketUrl, { transports: ['websocket'] });

        // store on ref so we can disconnect on unmount
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
          // request initial feed via socket ack
          socket.emit('getFeed', (payload: any) => {
            if (!mounted) return;
            if (payload && payload.success) {
              setFeeds(payload.data);
            }
          });
        });

        socket.on('newFeed', (feed: Feed) => {
          if (!mounted) return;
          setFeeds((prev) => [feed, ...prev]);
        });

        socket.on('disconnect', () => console.log('Socket disconnected'));
      } catch (err) {
        console.warn('Socket.IO client failed to load or connect', err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleAddFeed = async () => {
    if (!newMessage.trim()) {
      setPostError('Message cannot be empty');
      return;
    }

    try {
      setIsPosting(true);
      setPostError(null);
      await axios.post(`${apiUrl}/feed`, { message: newMessage });
      setNewMessage('');
      setIsModalOpen(false);
      // no need to manually fetch; backend emits `newFeed`
    } catch (err) {
      setPostError('Failed to add feed');
      console.error('Error adding feed:', err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black min-h-screen p-4">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Feeds</h1>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setPostError(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            + Add
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading feeds...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {!loading && feeds.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No feeds available yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
            >
              <p className="text-gray-900 dark:text-white text-lg mb-3">{feed.message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(feed.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add New Feed</h2>

            {postError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                <p>{postError}</p>
              </div>
            )}

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              disabled={isPosting}
            />

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewMessage('');
                  setPostError(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition disabled:opacity-50"
                disabled={isPosting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddFeed}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPosting}
              >
                {isPosting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
