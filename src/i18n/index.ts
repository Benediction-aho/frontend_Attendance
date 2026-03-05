import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Auth
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      firstName: 'First Name',
      lastName: 'Last Name',
      position: 'Position',
      employeeType: 'Employee Type',
      stagiaire: 'Intern',
      employe: 'Employee',
      adminLogin: 'Admin Login',
      employeeLogin: 'Employee Login',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      // Nav
      dashboard: 'Dashboard',
      checkIn: 'Check In',
      tasks: 'Tasks',
      myStats: 'My Stats',
      employees: 'Employees',
      analytics: 'Analytics',
      // Actions
      checkInNow: 'Check In Now',
      checkOut: 'Check Out',
      addTask: 'Add Task',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      // Status
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      onTime: 'On Time',
      completed: 'Completed',
      pending: 'Pending',
      blocked: 'Blocked',
      active: 'Active',
      // Stats
      totalPresence: 'Total Presence',
      hoursWorked: 'Hours Worked',
      lateArrivals: 'Late Arrivals',
      earlyLeaves: 'Early Leaves',
      totalTasks: 'Total Tasks',
      completedTasks: 'Completed Tasks',
      // Messages
      locationRequired: 'Geolocation is required for check-in',
      checkInSuccess: 'Check-in successful!',
      checkOutSuccess: 'Check-out successful!',
      outOfPerimeter: 'You are outside the authorized zone',
      taskCreated: 'Task created successfully',
      taskUpdated: 'Task updated successfully',
      taskDeleted: 'Task deleted',
      mustCheckIn: 'You must check in to manage tasks',
      // Admin
      createEmployee: 'Create Employee',
      createAdmin: 'Create Admin',
      blockUser: 'Block User',
      unblockUser: 'Unblock User',
      deleteUser: 'Delete User',
      outOfPerimeterAttempts: 'Out-of-Perimeter Attempts',
      // Theme
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
    },
  },
  fr: {
    translation: {
      // Auth
      login: 'Connexion',
      register: "S'inscrire",
      logout: 'Déconnexion',
      email: 'Email',
      password: 'Mot de passe',
      firstName: 'Prénom',
      lastName: 'Nom',
      position: 'Poste',
      employeeType: "Type d'employé",
      stagiaire: 'Stagiaire',
      employe: 'Employé',
      adminLogin: 'Connexion Admin',
      employeeLogin: 'Connexion Employé',
      noAccount: "Pas de compte ?",
      haveAccount: 'Déjà un compte ?',
      // Nav
      dashboard: 'Tableau de bord',
      checkIn: "Pointage d'entrée",
      tasks: 'Tâches',
      myStats: 'Mes statistiques',
      employees: 'Employés',
      analytics: 'Analytiques',
      // Actions
      checkInNow: 'Pointer maintenant',
      checkOut: 'Pointer la sortie',
      addTask: 'Ajouter une tâche',
      edit: 'Modifier',
      delete: 'Supprimer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      // Status
      present: 'Présent',
      absent: 'Absent',
      late: 'En retard',
      onTime: "À l'heure",
      completed: 'Terminé',
      pending: 'En cours',
      blocked: 'Bloqué',
      active: 'Actif',
      // Stats
      totalPresence: 'Total présences',
      hoursWorked: 'Heures travaillées',
      lateArrivals: 'Retards',
      earlyLeaves: 'Départs anticipés',
      totalTasks: 'Total tâches',
      completedTasks: 'Tâches terminées',
      // Messages
      locationRequired: 'La géolocalisation est requise pour le pointage',
      checkInSuccess: 'Pointage effectué !',
      checkOutSuccess: 'Sortie enregistrée !',
      outOfPerimeter: "Vous êtes hors de la zone autorisée",
      taskCreated: 'Tâche créée avec succès',
      taskUpdated: 'Tâche mise à jour',
      taskDeleted: 'Tâche supprimée',
      mustCheckIn: 'Vous devez pointer pour gérer les tâches',
      // Admin
      createEmployee: 'Créer un employé',
      createAdmin: 'Créer un admin',
      blockUser: "Bloquer l'utilisateur",
      unblockUser: "Débloquer l'utilisateur",
      deleteUser: "Supprimer l'utilisateur",
      outOfPerimeterAttempts: 'Tentatives hors périmètre',
      // Theme
      darkMode: 'Mode sombre',
      lightMode: 'Mode clair',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('lang') || 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
