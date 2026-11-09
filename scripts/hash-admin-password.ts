import bcrypt from "bcryptjs";

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("Set ADMIN_PASSWORD in the environment before running this script.");
  }
  if (Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be between 12 and 72 bytes.");
  }
  console.log(await bcrypt.hash(password, 12));
}

main().catch((error: unknown) => {
  console.error("Failed to hash administrator password.", error);
  process.exitCode = 1;
});
