export default defineEventHandler(async () => {
  const dbUrl = process.env.DATABASE_URL;
  return await prisma.user.findMany();
});
