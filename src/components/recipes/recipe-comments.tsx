"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Star, Trash2, Send } from "lucide-react";
import { addComment, deleteComment } from "@/actions/comments";
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

  const handleSubmit = () => {
    if (!text.trim()) return;
    setError(null);
    
    startTransition(async () => {
      const result = await addComment(recipeId, text, rating > 0 ? rating : undefined);
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

  return (
    <Card className="border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-amber-500" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        {/* Add Comment Form */}
        {session?.user ? (
          <div className="space-y-3 pb-4 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Votre note :</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(rating === star ? 0 : star)}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Partagez votre avis ou vos astuces..."
              rows={3}
              disabled={isPending}
              maxLength={1000}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !text.trim()}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Send className="h-4 w-4 mr-2" />
                Publier
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 border-b border-amber-100">
            <p className="text-muted-foreground mb-2">
              Connectez-vous pour laisser un commentaire
            </p>
            <Button asChild variant="outline">
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
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.user.image || ""} />
                  <AvatarFallback className="bg-amber-100 text-amber-600">
                    {comment.user.pseudo.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{comment.user.pseudo}</span>
                    {comment.rating && (
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= comment.rating!
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {session?.user?.id === comment.user.id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-stone-700 mt-1">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

