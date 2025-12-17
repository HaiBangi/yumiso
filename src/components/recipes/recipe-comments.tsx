"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Star, Trash2, Send, Edit, X } from "lucide-react";
import { addComment, deleteComment, updateComment } from "@/actions/comments";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Comment {
  id: number;
  text: string;
  rating: number | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    pseudo: string;
    image: string | null;
  };
}

interface RecipeCommentsProps {
  recipeId: number;
  comments: Comment[];
}

export function RecipeComments({ recipeId, comments }: RecipeCommentsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // États pour l'édition
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState<number>(0);

  const handleSubmit = () => {
    if (!text.trim()) return;
    setError(null);
    
    startTransition(async () => {
      const ratingToSend = rating > 0 ? rating : undefined;
      const result = await addComment(recipeId, text, ratingToSend);
      if (result.success) {
        setText("");
        setRating(0);
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  const handleDelete = (commentId: number) => {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setEditRating(comment.rating || 0);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditRating(0);
    setError(null);
  };

  const handleUpdate = (commentId: number) => {
    if (!editText.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await updateComment(commentId, editText, editRating > 0 ? editRating : undefined);
      if (result.success) {
        setEditingId(null);
        setEditText("");
        setEditRating(0);
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, isEditing: boolean, commentId?: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isEditing && commentId) {
        handleUpdate(commentId);
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <Card className="border border-amber-100 dark:border-amber-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <MessageCircle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        {/* Add Comment Form */}
        {session?.user ? (
          <div className="space-y-3 pb-4 border-b border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Votre note :</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? 0 : star)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    disabled={isPending}
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-stone-600 hover:text-yellow-300 dark:hover:text-yellow-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  {rating}/10
                </span>
              )}
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Partagez votre avis ou vos astuces... (Entrée pour publier, Shift+Entrée pour nouvelle ligne)"
              rows={3}
              disabled={isPending}
              maxLength={1000}
              className="text-[13px] placeholder:text-[13px] dark:bg-stone-700 dark:border-stone-600 dark:text-stone-100 dark:placeholder:text-stone-400"
            />
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !text.trim()}
                className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Publier
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 border-b border-amber-100 dark:border-amber-900/50">
            <p className="text-muted-foreground mb-2">
              Connectez-vous pour laisser un commentaire
            </p>
            <Button asChild variant="outline" className="dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
              <Link href="/auth/signin">Se connecter</Link>
            </Button>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun commentaire pour le moment. Soyez le premier !
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isEditing = editingId === comment.id;
              const isOwner = session?.user?.id === comment.user.id;

              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={comment.user.image || ""} />
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                      {comment.user.pseudo.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      // Mode édition
                      <div className="space-y-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Note :</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setEditRating(editRating === star ? 0 : star)}
                                disabled={isPending}
                                className="cursor-pointer transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`h-4 w-4 transition-colors ${
                                    star <= editRating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300 dark:text-stone-600 hover:text-yellow-300 dark:hover:text-yellow-400"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          {editRating > 0 && (
                            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                              {editRating}/10
                            </span>
                          )}
                        </div>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, true, comment.id)}
                          placeholder="Modifiez votre commentaire... (Entrée pour enregistrer, Shift+Entrée pour nouvelle ligne)"
                          rows={3}
                          disabled={isPending}
                          maxLength={1000}
                          className="text-[13px] placeholder:text-[13px] dark:bg-stone-700 dark:border-stone-600 dark:text-stone-100"
                        />
                        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={isPending}
                            className="h-8"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(comment.id)}
                            disabled={isPending || !editText.trim()}
                            className="h-8 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Mode affichage
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            {comment.user.pseudo}
                          </span>
                          {comment.rating && comment.rating > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-black/80 dark:bg-stone-900/90 rounded-md backdrop-blur-sm">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-medium text-white">{comment.rating}/10</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          {isOwner && (
                            <div className="flex gap-1 ml-auto">
                              <button
                                onClick={() => startEditing(comment)}
                                disabled={isPending}
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer transition-colors"
                                title="Modifier"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(comment.id)}
                                disabled={isPending}
                                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-1 whitespace-pre-wrap break-words">
                          {comment.text}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

