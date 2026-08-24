-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('LECON_CONDUITE', 'PLACE_EXAMEN');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MATIN', 'MIDI', 'APRES_MIDI', 'SOIR');

-- CreateEnum
CREATE TYPE "SlotAlertStatus" AS ENUM ('NOUVEAU', 'NOTIFIE', 'RESERVE', 'MANQUE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMEE', 'ANNULEE', 'TERMINEE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "blocked_until" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stych_session_cookie" TEXT,
    "stych_csrf_token" TEXT,
    "stych_connected_at" TIMESTAMP(3),
    "stych_agence" TEXT DEFAULT 'Strasbourg',
    "stych_polling_paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Semaine normale',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "time_slots" "TimeSlot"[] DEFAULT ARRAY[]::"TimeSlot"[],
    "course_type" "CourseType" NOT NULL DEFAULT 'LECON_CONDUITE',
    "moniteur_id" TEXT,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotAlert" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "search_profile_id" TEXT,
    "status" "SlotAlertStatus" NOT NULL DEFAULT 'NOUVEAU',
    "stych_moniteur_id" TEXT,
    "moniteur_name" TEXT,
    "stych_lac_id" TEXT,
    "lieu_name" TEXT,
    "course_date" TIMESTAMP(3) NOT NULL,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "nb_credit" DOUBLE PRECISION,
    "nb_heure" DOUBLE PRECISION,
    "raw_payload" JSONB,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),

    CONSTRAINT "SlotAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_alert_id" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMEE',
    "moniteur_name" TEXT,
    "lieu_name" TEXT,
    "course_date" TIMESTAMP(3) NOT NULL,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "nb_credit" DOUBLE PRECISION,
    "nb_heure" DOUBLE PRECISION,
    "stych_confirmation_ref" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollingLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slots_found" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,

    CONSTRAINT "PollingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SearchProfile_user_id_idx" ON "SearchProfile"("user_id");

-- CreateIndex
CREATE INDEX "SlotAlert_user_id_status_idx" ON "SlotAlert"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_slot_alert_id_key" ON "Booking"("slot_alert_id");

-- CreateIndex
CREATE INDEX "Booking_user_id_idx" ON "Booking"("user_id");

-- CreateIndex
CREATE INDEX "PollingLog_user_id_ran_at_idx" ON "PollingLog"("user_id", "ran_at");

-- AddForeignKey
ALTER TABLE "SearchProfile" ADD CONSTRAINT "SearchProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAlert" ADD CONSTRAINT "SlotAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAlert" ADD CONSTRAINT "SlotAlert_search_profile_id_fkey" FOREIGN KEY ("search_profile_id") REFERENCES "SearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slot_alert_id_fkey" FOREIGN KEY ("slot_alert_id") REFERENCES "SlotAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollingLog" ADD CONSTRAINT "PollingLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
