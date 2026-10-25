export const formatOrderStatus = (status?: string | null) => {
  if (!status) {
    return "Unknown"
  }

  const words = status.split("_").join(" ")

  return words.charAt(0).toUpperCase() + words.slice(1)
}
