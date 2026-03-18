import { Router } from "express";
import { z } from "zod";
import prisma from "../../config/db";
import { authMiddleware } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

const createDirectSchema = z.object({
  type: z.literal("direct"),
  targetUserId: z.string().uuid(),
});

const createGroupSchema = z.object({
  type: z.literal("group"),
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1),
  avatarUrl: z.string().url().nullable().optional(),
});

const createChatSchema = z.discriminatedUnion("type", [
  createDirectSchema,
  createGroupSchema,
]);

router.post("/", async (req, res) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const userId = req.user!.id;
  const data = parsed.data;

  if (data.type === "direct") {
    if (data.targetUserId === userId) {
      throw new AppError(400, "Cannot create a chat with yourself");
    }

    // Check for existing direct chat between these two users
    const existing = await prisma.chat.findFirst({
      where: {
        type: "direct",
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: data.targetUserId } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    });

    if (existing) {
      res.json(existing);
      return;
    }

    const chat = await prisma.$transaction(async (tx) => {
      const newChat = await tx.chat.create({
        data: {
          type: "direct",
          createdBy: userId,
          members: {
            create: [
              { userId, role: "member" },
              { userId: data.targetUserId, role: "member" },
            ],
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
        },
      });
      return newChat;
    });

    res.status(201).json(chat);
    return;
  }

  // Group chat
  const chat = await prisma.$transaction(async (tx) => {
    const uniqueMemberIds = [...new Set([...data.memberIds.filter((id) => id !== userId)])];

    const newChat = await tx.chat.create({
      data: {
        type: "group",
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
        createdBy: userId,
        members: {
          create: [
            { userId, role: "admin" },
            ...uniqueMemberIds.map((id) => ({ userId: id, role: "member" as const })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    });
    return newChat;
  });

  res.status(201).json(chat);
});

router.get("/", async (req, res) => {
  const userId = req.user!.id;

  const chats = await prisma.chat.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, username: true } },
          file: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = chats.map((chat) => ({
    ...chat,
    lastMessage: chat.messages[0] ?? null,
    messages: undefined,
  }));

  res.json(result);
});

router.get("/:id", async (req, res) => {
  const userId = req.user!.id;
  const chatId = req.params.id;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      members: { some: { userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatarUrl: true, lastSeen: true } } },
      },
    },
  });

  if (!chat) {
    throw new AppError(404, "Chat not found");
  }

  res.json(chat);
});

router.get("/:id/messages", async (req, res) => {
  const userId = req.user!.id;
  const chatId = req.params.id;

  // Verify membership
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });

  if (!membership) {
    throw new AppError(403, "Not a member of this chat");
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  const messages = await prisma.message.findMany({
    where: {
      chatId,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      file: true,
    },
  });

  const nextCursor =
    messages.length === limit
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

  res.json({ messages, nextCursor });
});

export default router;
