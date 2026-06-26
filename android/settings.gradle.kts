// Kotlin DSL replacement for settings.gradle

include(":app")

// Capacitor-generated plugin settings (auto-updated by `cap sync`, do not duplicate here)
apply(from = "capacitor.settings.gradle")
