import adminLogo from '../assets/Admin Logo.svg'
import controllerLogo from '../assets/Controller Logo.svg'
import driverLogo from '../assets/Driver Logo.svg'
import vmasLogo from '../assets/V-MAS Logo.svg'

/**
 * Utility to get system logo based on user profile role.
 * - ADMIN profile -> Admin Logo.svg
 * - CONTROLLER profile -> Controller Logo.svg
 * - DRIVER profile -> Driver Logo.svg
 */
export const getRoleLogo = (role) => {
  if (!role) return vmasLogo
  const r = String(role).toUpperCase().trim()
  if (r === 'ADMIN') return adminLogo
  if (r === 'CONTROLLER') return controllerLogo
  if (r === 'DRIVER') return driverLogo
  return vmasLogo
}

export { adminLogo, controllerLogo, driverLogo, vmasLogo }
