// Kotlin DSL replacement for variables.gradle
// Keeps only versions needed by the Capacitor WebView shell.
// Compose/Hilt/Room/Retrofit/Accompanist versions removed — those libs are quarantined.

extra["minSdkVersion"] = 23
extra["compileSdkVersion"] = 35
extra["targetSdkVersion"] = 35
extra["kotlinVersion"] = "1.9.24"
extra["androidxCoreVersion"] = "1.15.0"
extra["androidxAppCompatVersion"] = "1.7.0"

// Testing
extra["junitVersion"] = "4.13.2"
extra["androidxJunitVersion"] = "1.2.1"
extra["androidxEspressoCoreVersion"] = "3.6.1"
