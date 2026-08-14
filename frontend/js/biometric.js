/**
 * Biometric Manager (WebAuthn API for Fingerprint / TouchID / FaceID)
 * Allows fast 1-tap biometric login for supervisors on supported devices.
 */

window.BiometricManager = {
  // Check if device supports WebAuthn Biometrics
  isSupported: function() {
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get
    );
  },

  // Check if User Verifying Platform Authenticator (Fingerprint/FaceID) is available (STRICTLY MOBILE & TABLET ONLY)
  isPlatformBiometricAvailable: async function() {
    if (!this.isSupported()) return false;

    // Strictly disable biometrics on Desktop PC / Laptop (Windows, Mac Desktop, Linux)
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(ua);
    if (!isMobile) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn('[Biometric] Availability check failed:', e);
      return false;
    }
  },

  // Register Fingerprint / FaceID Credential for Supervisor
  registerCredential: async function(userId) {
    if (!await this.isPlatformBiometricAvailable()) {
      throw new Error('Sensor Biometrik (Fingerprint/FaceID) tidak tersedia pada perangkat ini.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "Approval Anywhere — BPR Syariah HIK MCI",
        id: window.location.hostname
      },
      user: {
        id: userIdBytes,
        name: userId,
        displayName: `Supervisor ${userId}`
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "direct"
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (!credential) {
      throw new Error('Pendaftaran Biometrik dibatalkan.');
    }

    const credentialData = {
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      type: credential.type
    };

    localStorage.setItem(`biometric_cred_${userId}`, JSON.stringify(credentialData));
    localStorage.setItem('last_biometric_user', userId);
    return credentialData;
  },

  // Authenticate Supervisor via Fingerprint / FaceID
  authenticate: async function(userId) {
    const targetUser = userId || localStorage.getItem('last_biometric_user');
    if (!targetUser) {
      throw new Error('Belum ada biometrik terdaftar untuk user ini.');
    }

    const storedCredStr = localStorage.getItem(`biometric_cred_${targetUser}`);
    if (!storedCredStr) {
      throw new Error('Belum ada biometrik terdaftar pada perangkat ini.');
    }

    const storedCred = JSON.parse(storedCredStr);
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions = {
      challenge: challenge,
      allowCredentials: [{
        id: new Uint8Array(storedCred.rawId).buffer,
        type: 'public-key'
      }],
      userVerification: 'required',
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (!assertion) {
      throw new Error('Verifikasi Biometrik gagal.');
    }

    return {
      userId: targetUser,
      credentialId: assertion.id
    };
  },

  // Check if biometric credential exists for a given user
  hasCredential: function(userId) {
    const targetUser = userId || localStorage.getItem('last_biometric_user');
    if (!targetUser) return false;
    return !!localStorage.getItem(`biometric_cred_${targetUser}`);
  }
};
