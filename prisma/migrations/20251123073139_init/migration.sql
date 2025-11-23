-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('F', 'M');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('PENDING', 'SOLVING', 'COMPLETED', 'FAILED', 'INFEASIBLE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('APN', 'DAY_NIGHT');

-- CreateEnum
CREATE TYPE "SystemConfigScope" AS ENUM ('GLOBAL', 'ROSTER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "staff_group_id" TEXT,
    "gender" "Gender",
    "monthly_min_hours" INTEGER,
    "monthly_max_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_role" (
    "staff_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_role_pkey" PRIMARY KEY ("staff_id","role_id")
);

-- CreateTable
CREATE TABLE "shift_definition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "start_minutes" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_definition_audit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "start_minutes" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" TEXT,
    "reason" TEXT,

    CONSTRAINT "shift_definition_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "RosterStatus" NOT NULL DEFAULT 'PENDING',
    "shift_type" "ShiftType" NOT NULL DEFAULT 'APN',
    "solve_time_ms" DOUBLE PRECISION,
    "solver_status" TEXT,
    "error_message" TEXT,
    "time_slots" INTEGER NOT NULL,
    "states" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" TEXT NOT NULL,
    "roster_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "time_slot" INTEGER NOT NULL,
    "state" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config_group" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "SystemConfigScope" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config_item" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConstraintToRoster" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConstraintToRoster_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employee_id_key" ON "staff"("employee_id");

-- CreateIndex
CREATE INDEX "staff_employee_id_idx" ON "staff"("employee_id");

-- CreateIndex
CREATE INDEX "staff_is_active_idx" ON "staff"("is_active");

-- CreateIndex
CREATE INDEX "staff_staff_group_id_idx" ON "staff"("staff_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_order_key" ON "role"("order");

-- CreateIndex
CREATE INDEX "staff_role_role_id_idx" ON "staff_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_definition_code_key" ON "shift_definition"("code");

-- CreateIndex
CREATE INDEX "staff_group_is_active_idx" ON "staff_group"("is_active");

-- CreateIndex
CREATE INDEX "constraint_type_idx" ON "constraint"("type");

-- CreateIndex
CREATE INDEX "constraint_is_active_idx" ON "constraint"("is_active");

-- CreateIndex
CREATE INDEX "roster_status_idx" ON "roster"("status");

-- CreateIndex
CREATE INDEX "roster_start_date_end_date_idx" ON "roster"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "roster_shift_type_idx" ON "roster"("shift_type");

-- CreateIndex
CREATE INDEX "shift_roster_id_time_slot_idx" ON "shift"("roster_id", "time_slot");

-- CreateIndex
CREATE INDEX "shift_staff_id_date_idx" ON "shift"("staff_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_roster_id_staff_id_time_slot_key" ON "shift"("roster_id", "staff_id", "time_slot");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_group_code_key" ON "system_config_group"("code");

-- CreateIndex
CREATE INDEX "system_config_group_scope_idx" ON "system_config_group"("scope");

-- CreateIndex
CREATE INDEX "system_config_group_is_active_idx" ON "system_config_group"("is_active");

-- CreateIndex
CREATE INDEX "system_config_item_is_active_idx" ON "system_config_item"("is_active");

-- CreateIndex
CREATE INDEX "system_config_item_type_idx" ON "system_config_item"("type");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_item_group_id_key_key" ON "system_config_item"("group_id", "key");

-- CreateIndex
CREATE INDEX "_ConstraintToRoster_B_index" ON "_ConstraintToRoster"("B");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_staff_group_id_fkey" FOREIGN KEY ("staff_group_id") REFERENCES "staff_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_config_item" ADD CONSTRAINT "system_config_item_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "system_config_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConstraintToRoster" ADD CONSTRAINT "_ConstraintToRoster_A_fkey" FOREIGN KEY ("A") REFERENCES "constraint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConstraintToRoster" ADD CONSTRAINT "_ConstraintToRoster_B_fkey" FOREIGN KEY ("B") REFERENCES "roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
