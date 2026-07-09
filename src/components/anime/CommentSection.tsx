"use client";
import React, { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  deleteDoc, 
  serverTimestamp,
  type Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  MessageSquare, 
  Trash2, 
  Loader2, 
  Lock, 
  AlertCircle, 
  Send,
  Sparkles,
  CornerDownRight,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";

interface CommentSectionProps {
  animeId: string;
  episodeNum?: string;
  animeTitle?: string;
}

interface CommentType {
  id: string;
  animeId: string;
  episodeNum: string | null;
  targetId: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  userThemeColor?: string;
  content: string;
  createdAt: Timestamp | null;
  parentId?: string | null;
  parentUserName?: string | null;
  likesCount?: number;
  dislikesCount?: number;
}

const getThemeTextClass = (theme?: string) => {
  switch (theme) {
    case "rose": return "text-rose-500 hover:text-rose-400";
    case "amber": return "text-amber-500 hover:text-amber-400";
    case "emerald": return "text-emerald-500 hover:text-emerald-400";
    case "indigo": return "text-indigo-500 hover:text-indigo-400";
    default: return "text-violet-500 hover:text-violet-400";
  }
};

export function CommentSection({ animeId, episodeNum, animeTitle }: CommentSectionProps) {
  const { user, openAuthModal, updateLastCommentedAt } = useAuth();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  // Reply states
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Reaction states
  const [reactions, setReactions] = useState<Record<string, "like" | "dislike">>({});

  // Target ID: different scopes for details page vs. specific episode
  const targetId = episodeNum ? `${animeId}_ep_${episodeNum}` : animeId;

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cooldown calculation helper
  const getRemainingCooldown = (lastComment: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastComment.getTime();
    const cooldownMs = 5 * 60 * 1000;
    return Math.max(0, cooldownMs - diffMs);
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (!user?.lastCommentedAt) {
      setRemainingMs(0);
      return;
    }

    const updateTimer = () => {
      const ms = getRemainingCooldown(user.lastCommentedAt!);
      setRemainingMs(ms);
      return ms;
    };

    const initialMs = updateTimer();
    if (initialMs <= 0) return;

    const interval = setInterval(() => {
      const ms = updateTimer();
      if (ms <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.lastCommentedAt]);

  // Listen to user's comment reactions
  useEffect(() => {
    if (!user) {
      setReactions({});
      return;
    }

    const q = query(
      collection(db, "comment_reactions"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeReactions: Record<string, "like" | "dislike"> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.commentId && data.type) {
          activeReactions[data.commentId] = data.type;
        }
      });
      setReactions(activeReactions);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time comments listener
  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("targetId", "==", targetId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommentType[];

      // Sort client-side to avoid needing composite indexes in Firestore
      fetchedComments.sort((a, b) => {
        const aTime = a.createdAt
          ? (typeof a.createdAt.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt as any).getTime())
          : Date.now();
        const bTime = b.createdAt
          ? (typeof b.createdAt.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt as any).getTime())
          : Date.now();
        return bTime - aTime;
      });

      setComments(fetchedComments);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedText = commentText.trim();
    if (!trimmedText) return;

    if (remainingMs > 0) {
      toast({
        variant: "destructive",
        title: "Slow down!",
        description: `Please wait ${formatCooldown(remainingMs)} before commenting again.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, "comments"));
      const userRef = doc(db, "users", user.uid);

      batch.set(commentRef, {
        animeId,
        episodeNum: episodeNum || null,
        targetId,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userPhoto: user.photoURL || null,
        userThemeColor: user.themeColor || "violet",
        content: trimmedText,
        createdAt: serverTimestamp(),
        parentId: null,
        parentUserName: null,
        likesCount: 0,
        dislikesCount: 0,
      });

      batch.update(userRef, {
        lastCommentedAt: serverTimestamp(),
      });

      await batch.commit();

      // Start client cooldown instantly
      const localTime = new Date();
      updateLastCommentedAt(localTime);
      setCommentText("");
      
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to post comment",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string, parentUserName: string, parentUserId?: string) => {
    if (!user) return;

    const trimmedText = replyText.trim();
    if (!trimmedText) return;

    if (remainingMs > 0) {
      toast({
        variant: "destructive",
        title: "Slow down!",
        description: `Please wait ${formatCooldown(remainingMs)} before replying.`,
      });
      return;
    }

    setIsSubmittingReply(true);
    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, "comments"));
      const userRef = doc(db, "users", user.uid);

      batch.set(commentRef, {
        animeId,
        episodeNum: episodeNum || null,
        targetId,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userPhoto: user.photoURL || null,
        userThemeColor: user.themeColor || "violet",
        content: trimmedText,
        createdAt: serverTimestamp(),
        parentId,
        parentUserName,
        likesCount: 0,
        dislikesCount: 0,
      });

      batch.update(userRef, {
        lastCommentedAt: serverTimestamp(),
      });

      // Write notification for the parent comment owner if it is not the current user
      if (parentUserId && parentUserId !== user.uid) {
        const notifRef = doc(collection(db, "notifications"));
        const displayAnimeName = animeTitle || animeId;
        const msg = `${user.displayName || "Someone"} replied to your comment on ${displayAnimeName}${episodeNum ? ` Ep ${episodeNum}` : ""}: "${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? "..." : ""}"`;

        batch.set(notifRef, {
          userId: parentUserId,
          type: "reply",
          title: "New Reply",
          message: msg,
          link: episodeNum 
            ? `/watch/${animeId}?ep=${episodeNum}` 
            : `/anime/${animeId}`,
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: user.uid,
          senderName: user.displayName || "Anonymous User",
        });
      }

      await batch.commit();

      // Start client cooldown instantly
      const localTime = new Date();
      updateLastCommentedAt(localTime);
      setReplyText("");
      setReplyToId(null);
      
      toast({
        title: "Reply posted!",
        description: "Your reply has been added successfully.",
      });
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      toast({
        variant: "destructive",
        title: "Failed to post reply",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReaction = async (commentId: string, reactionType: "like" | "dislike") => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    const currentReaction = reactions[commentId];
    const reactionRef = doc(db, "comment_reactions", `${commentId}_${user.uid}`);
    const commentRef = doc(db, "comments", commentId);

    try {
      const batch = writeBatch(db);

      let likesDelta = 0;
      let dislikesDelta = 0;

      if (!currentReaction) {
        batch.set(reactionRef, {
          userId: user.uid,
          commentId,
          type: reactionType,
          createdAt: serverTimestamp(),
        });
        if (reactionType === "like") likesDelta = 1;
        else dislikesDelta = 1;
      } else if (currentReaction === reactionType) {
        batch.delete(reactionRef);
        if (reactionType === "like") likesDelta = -1;
        else dislikesDelta = -1;
      } else {
        batch.update(reactionRef, {
          type: reactionType,
          updatedAt: serverTimestamp(),
        });
        if (reactionType === "like") {
          likesDelta = 1;
          dislikesDelta = -1;
        } else {
          likesDelta = -1;
          dislikesDelta = 1;
        }
      }

      const commentDoc = comments.find((c) => c.id === commentId);
      const currentLikes = commentDoc?.likesCount || 0;
      const currentDislikes = commentDoc?.dislikesCount || 0;

      batch.update(commentRef, {
        likesCount: Math.max(0, currentLikes + likesDelta),
        dislikesCount: Math.max(0, currentDislikes + dislikesDelta),
      });

      await batch.commit();
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast({
        variant: "destructive",
        title: "Reaction failed",
        description: "An error occurred while updating your reaction.",
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    setDeletingId(commentId);

    try {
      await deleteDoc(doc(db, "comments", commentId));
      toast({
        title: "Comment deleted",
        description: "The comment has been successfully removed.",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "You do not have permission to delete this comment.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCooldown = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  // Separation of comments and replies
  const parentComments = comments.filter(c => !c.parentId);

  const getRepliesFor = (parentId: string) => {
    return comments
      .filter(c => c.parentId === parentId)
      .sort((a, b) => {
        const aTime = a.createdAt
          ? (typeof a.createdAt.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt as any).getTime())
          : 0;
        const bTime = b.createdAt
          ? (typeof b.createdAt.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt as any).getTime())
          : 0;
        return aTime - bTime; // oldest replies first
      });
  };

  if (!mounted) {
    return (
      <div className="space-y-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading comments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-8 border-t border-border/50">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            Comments
            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {comments.length}
            </span>
          </h2>
        </div>
      </div>

      {/* Write Comment Form */}
      <div className="p-1 rounded-xl bg-gradient-to-br from-card/30 to-card/10 border border-border/40 shadow-inner">
        {!user ? (
          <div className="p-6 text-center space-y-4 rounded-lg bg-card/20 backdrop-blur-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Join the Discussion</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Sign in to share your thoughts on this {episodeNum ? "episode" : "anime"} with the community.
              </p>
            </div>
            <Button
              onClick={() => openAuthModal("login")}
              variant="default"
              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-300"
            >
              Log In to Comment
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 rounded-lg bg-card/25 backdrop-blur-sm">
            {/* Countdown / Cooldown Warning */}
            {remainingMs > 0 && (
              <div className="flex items-center gap-3 p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  You can post another comment in <strong className="font-bold underline">{formatCooldown(remainingMs)}</strong>.
                </span>
              </div>
            )}

            <div className="flex gap-4 items-start">
              <Link href={`/library?user=${user.displayName || user.uid}`} className="hover:opacity-85 transition-opacity">
                <Avatar className="h-10 w-10 border border-border ring-2 ring-primary/20">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-1 text-foreground/90">
                    Posting as <Link href={`/library?user=${user.displayName || user.uid}`} className={`font-bold hover:underline ${getThemeTextClass(user.themeColor)}`}>{user.displayName}</Link>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {commentText.length}/500
                  </span>
                </div>

                <Textarea
                  placeholder={
                    remainingMs > 0
                      ? "Commenting is locked during cooldown..."
                      : `Write a comment about this ${episodeNum ? "episode" : "anime"}...`
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                  disabled={isSubmitting || remainingMs > 0}
                  className="min-h-[100px] resize-none bg-background/50 border-border/60 focus-visible:ring-primary focus-visible:border-primary/60 transition-all rounded-lg"
                  required
                />

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmitting || remainingMs > 0 || !commentText.trim()}
                    className="font-bold flex items-center gap-2 px-5 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all duration-300 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse p-4 rounded-lg bg-card/15 border border-border/30">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : parentComments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/40 rounded-xl bg-card/5 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground/80 font-semibold">No comments yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {parentComments.map((comment) => {
              const isOwner = user?.uid === comment.userId;
              const formattedTime = comment.createdAt
                ? formatDistanceToNow(
                  typeof comment.createdAt.toDate === "function"
                    ? comment.createdAt.toDate()
                    : new Date(comment.createdAt as any),
                  { addSuffix: true }
                )
                : "Just now";

              const parentReplies = getRepliesFor(comment.id);

              return (
                <div key={comment.id} className="space-y-4">
                  {/* Parent Comment */}
                  <div className="group flex gap-4 p-4 rounded-xl border border-border/50 bg-card/10 hover:bg-card/20 transition-all duration-300 shadow-sm">
                    <Link href={`/library?user=${comment.userName || comment.userId}`} className="hover:opacity-85 transition-opacity">
                      <Avatar className="h-10 w-10 border border-border/80">
                        <AvatarImage src={comment.userPhoto || undefined} alt={comment.userName} />
                        <AvatarFallback className="bg-primary/5 text-primary font-semibold text-xs">
                          {comment.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link href={`/library?user=${comment.userName || comment.userId}`} className="hover:underline">
                            <span className={`text-sm font-bold ${getThemeTextClass(comment.userThemeColor)}`}>
                              {comment.userName}
                            </span>
                          </Link>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formattedTime}
                          </span>
                        </div>

                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                            title="Delete Comment"
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </div>

                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed font-sans font-medium">
                        {comment.content}
                      </p>

                      {/* Comment Action Bar */}
                      <div className="flex items-center gap-4 pt-1.5 border-t border-border/10">
                        <button
                          onClick={() => {
                            if (!user) {
                              openAuthModal("login");
                              return;
                            }
                            setReplyToId(replyToId === comment.id ? null : comment.id);
                            setReplyText("");
                          }}
                          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Reply
                        </button>

                        <button
                          onClick={() => handleReaction(comment.id, "like")}
                          className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-green-500",
                            reactions[comment.id] === "like"
                              ? "text-green-500 font-bold"
                              : "text-muted-foreground"
                          )}
                          title="Like"
                        >
                          <ThumbsUp className={cn("w-3.5 h-3.5", reactions[comment.id] === "like" && "fill-current")} />
                          <span>{comment.likesCount || 0}</span>
                        </button>

                        <button
                          onClick={() => handleReaction(comment.id, "dislike")}
                          className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-rose-500",
                            reactions[comment.id] === "dislike"
                              ? "text-rose-500 font-bold"
                              : "text-muted-foreground"
                          )}
                          title="Dislike"
                        >
                          <ThumbsDown className={cn("w-3.5 h-3.5", reactions[comment.id] === "dislike" && "fill-current")} />
                          <span>{comment.dislikesCount || 0}</span>
                        </button>
                      </div>

                      {/* Inline Reply Form */}
                      {replyToId === comment.id && (
                        <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                          {remainingMs > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-amber-500 font-semibold animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Cooldown active: wait {formatCooldown(remainingMs)} before replying.</span>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                {user?.displayName?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                                <span>Replying to <span className="font-bold">@{comment.userName}</span></span>
                                <span>{replyText.length}/500</span>
                              </div>
                              <Textarea
                                placeholder="Type your reply here..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                                disabled={isSubmittingReply || remainingMs > 0}
                                className="min-h-[70px] text-xs resize-none bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReplyToId(null)}
                                  disabled={isSubmittingReply}
                                  className="text-xs h-8 font-semibold"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isSubmittingReply || remainingMs > 0 || !replyText.trim()}
                                  onClick={() => handleReplySubmit(comment.id, comment.userName, comment.userId)}
                                  className="text-xs h-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                                >
                                  {isSubmittingReply ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Replying...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      Reply
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replies (Threaded Indentation) */}
                  {parentReplies.length > 0 && (
                    <div className="pl-4 sm:pl-10 border-l border-border/50 ml-5 space-y-3 pt-1">
                      {parentReplies.map((reply) => {
                        const isReplyOwner = user?.uid === reply.userId;
                        const replyTime = reply.createdAt
                          ? formatDistanceToNow(
                            typeof reply.createdAt.toDate === "function"
                              ? reply.createdAt.toDate()
                              : new Date(reply.createdAt as any),
                            { addSuffix: true }
                          )
                          : "Just now";

                        return (
                          <div 
                            key={reply.id} 
                            className="group/reply flex gap-3 p-3 rounded-xl border border-border/30 bg-card/5 hover:bg-card/10 transition-all duration-200"
                          >
                            <Link href={`/library?user=${reply.userName || reply.userId}`} className="hover:opacity-85 transition-opacity">
                              <Avatar className="h-8 w-8 border border-border/80">
                                <AvatarImage src={reply.userPhoto || undefined} alt={reply.userName} />
                                <AvatarFallback className="bg-primary/5 text-primary font-semibold text-[10px]">
                                  {reply.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </Link>

                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <Link href={`/library?user=${reply.userName || reply.userId}`} className="hover:underline">
                                    <span className={`text-xs font-bold ${getThemeTextClass(reply.userThemeColor)}`}>
                                      {reply.userName}
                                    </span>
                                  </Link>
                                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <CornerDownRight className="w-3 h-3 text-muted-foreground/50" />
                                    {replyTime}
                                  </span>
                                </div>

                                {isReplyOwner && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(reply.id)}
                                    disabled={deletingId === reply.id}
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover/reply:opacity-100 focus:opacity-100 disabled:opacity-50 transition-all"
                                    title="Delete Reply"
                                  >
                                    {deletingId === reply.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>

                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed font-sans font-medium">
                                <span className="text-primary font-semibold mr-1">@{reply.parentUserName || comment.userName}</span>
                                {reply.content}
                              </p>

                              {/* Reply Action Bar */}
                              <div className="flex items-center gap-4 pt-1.5 mt-1 border-t border-border/5">
                                <button
                                  onClick={() => {
                                    if (!user) {
                                      openAuthModal("login");
                                      return;
                                    }
                                    setReplyToId(replyToId === reply.id ? null : reply.id);
                                    setReplyText("");
                                  }}
                                  className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Reply
                                </button>

                                <button
                                  onClick={() => handleReaction(reply.id, "like")}
                                  className={cn(
                                    "text-[10px] font-semibold flex items-center gap-1 transition-colors hover:text-green-500",
                                    reactions[reply.id] === "like"
                                      ? "text-green-500 font-bold"
                                      : "text-muted-foreground"
                                  )}
                                  title="Like"
                                >
                                  <ThumbsUp className={cn("w-3 h-3", reactions[reply.id] === "like" && "fill-current")} />
                                  <span>{reply.likesCount || 0}</span>
                                </button>

                                <button
                                  onClick={() => handleReaction(reply.id, "dislike")}
                                  className={cn(
                                    "text-[10px] font-semibold flex items-center gap-1 transition-colors hover:text-rose-500",
                                    reactions[reply.id] === "dislike"
                                      ? "text-rose-500 font-bold"
                                      : "text-muted-foreground"
                                  )}
                                  title="Dislike"
                                >
                                  <ThumbsDown className={cn("w-3 h-3", reactions[reply.id] === "dislike" && "fill-current")} />
                                  <span>{reply.dislikesCount || 0}</span>
                                </button>
                              </div>

                              {/* Inline Reply Form under Reply */}
                              {replyToId === reply.id && (
                                <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                  {remainingMs > 0 && (
                                    <div className="flex items-center gap-2 text-[10px] text-amber-500 font-semibold animate-pulse">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span>Cooldown active: wait {formatCooldown(remainingMs)} before replying.</span>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                      <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                        {user?.displayName?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                                        <span>Replying to <span className="font-bold">@{reply.userName}</span></span>
                                        <span>{replyText.length}/500</span>
                                      </div>
                                      <Textarea
                                        placeholder="Type your reply here..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                                        disabled={isSubmittingReply || remainingMs > 0}
                                        className="min-h-[70px] text-xs resize-none bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setReplyToId(null)}
                                          disabled={isSubmittingReply}
                                          className="text-xs h-8 font-semibold"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={isSubmittingReply || remainingMs > 0 || !replyText.trim()}
                                          onClick={() => handleReplySubmit(comment.id, reply.userName, reply.userId)}
                                          className="text-xs h-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                                        >
                                          {isSubmittingReply ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              Replying...
                                            </>
                                          ) : (
                                            <>
                                              <Send className="w-3 h-3" />
                                              Reply
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
