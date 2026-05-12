const HELLOPDF_LIMITS = {
  guest: {
    merge: 2,
    compress: 2,
    pdfToWord: 1,
    imageToPdf: 3,
    pdfToImage: 2,
    pdfToJpg: 2,
    pdfToPng: 2,
    htmlToPdf: 1
  },
  free: {
    merge: 5,
    compress: 5,
    pdfToWord: 3,
    imageToPdf: 5,
    pdfToImage: 5,
    pdfToJpg: 5,
    pdfToPng: 5,
    htmlToPdf: 3
  }
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getUsageKey(toolName) {
  return "hellopdf_usage_" + toolName + "_" + getTodayKey();
}

function isUserLoggedIn() {
  return !!localStorage.getItem("hellopdf_user_email");
}

function isPremiumUser() {
  return localStorage.getItem("hellopdf_plan") === "premium";
}

function getUserType() {
  if (isPremiumUser()) return "premium";
  if (isUserLoggedIn()) return "free";
  return "guest";
}

function getToolLimit(toolName) {
  const userType = getUserType();

  if (userType === "premium") return Infinity;

  return HELLOPDF_LIMITS[userType][toolName] || 1;
}

function getToolUsage(toolName) {
  return Number(localStorage.getItem(getUsageKey(toolName)) || 0);
}

function increaseToolUsage(toolName) {
  const key = getUsageKey(toolName);
  const current = getToolUsage(toolName);
  localStorage.setItem(key, current + 1);
}

function canUseTool(toolName) {
  const limit = getToolLimit(toolName);
  const used = getToolUsage(toolName);

  return used < limit;
}

function showUpgradeMessage(toolName) {
  const userType = getUserType();
  const limit = getToolLimit(toolName);

  const message =
    userType === "guest"
      ? `Free guest limit reached. You can use this tool ${limit} times per day. Please sign up or upgrade.`
      : `Daily free limit reached. Upgrade to Premium for unlimited usage.`;

  const goUpgrade = confirm(message + "\n\nGo to pricing page?");

  if (goUpgrade) {
    window.location.href = "/pricing.html";
  }
}

function checkToolLimit(toolName) {
  if (!canUseTool(toolName)) {
    showUpgradeMessage(toolName);
    return false;
  }

  return true;
}

function markToolUsed(toolName) {
  if (!isPremiumUser()) {
    increaseToolUsage(toolName);
  }
}