// Kotlin DSL replacement for build.gradle (root)
// Hilt classpath removed — the shell no longer uses DI.
// Google Services classpath kept commented: restore when google-services.json is provisioned.

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.9.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24")
        // classpath("com.google.gms:google-services:4.4.1") // restore after google-services.json is added
    }
}

apply(from = "variables.gradle.kts")

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}
