document.addEventListener('DOMContentLoaded', () => {
  const shareButton = document.getElementById('share-whatsapp')
  const ticketId = document.querySelector('[data-ticket-id]')?.textContent?.trim() ?? ''
  const amountPaid = document.querySelector('[data-amount-paid]')?.textContent?.trim() ?? ''
  const bookingDate = document.querySelector('[data-booking-date]')?.textContent?.trim() ?? ''

  if (shareButton) {
    shareButton.addEventListener('click', () => {
  const message = `Here is my ticket for Kurumbapatti Zoological Park!\nTicket ID: ${ticketId}\nAmount Paid: ${amountPaid}\nBooking Date: ${bookingDate}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank', 'noopener')
    })
  }
})
