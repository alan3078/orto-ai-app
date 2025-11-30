-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('F', 'M');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('PENDING', 'SOLVING', 'COMPLETED', 'FAILED', 'INFEASIBLE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('APN', 'SEVEN_E');

-- CreateEnum
CREATE TYPE "SystemConfigScope" AS ENUM ('GLOBAL', 'ROSTER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SL', 'PH', 'AL', 'UL', 'ML', 'CL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "visible_id" TEXT NOT NULL,
    "rank" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "staff_group_id" TEXT,
    "gender" "Gender",
    "user_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
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
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "shift_type" "ShiftType",
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
CREATE TABLE "shift_type_config" (
    "id" TEXT NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_hours_per_month" INTEGER NOT NULL DEFAULT 160,
    "max_hours_per_month" INTEGER NOT NULL DEFAULT 190,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_type_config_pkey" PRIMARY KEY ("id")
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
    "is_ic" BOOLEAN NOT NULL DEFAULT false,
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
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_reset_password" BOOLEAN NOT NULL DEFAULT true,
    "tos_accepted_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_module" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "action" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConstraintToRoster" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConstraintToRoster_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_visible_id_key" ON "staff"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- CreateIndex
CREATE INDEX "staff_visible_id_idx" ON "staff"("visible_id");

-- CreateIndex
CREATE INDEX "staff_is_active_idx" ON "staff"("is_active");

-- CreateIndex
CREATE INDEX "staff_staff_group_id_idx" ON "staff"("staff_group_id");

-- CreateIndex
CREATE INDEX "staff_rank_idx" ON "staff"("rank");

-- CreateIndex
CREATE INDEX "staff_deleted_at_idx" ON "staff"("deleted_at");

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
CREATE INDEX "constraint_shift_type_idx" ON "constraint"("shift_type");

-- CreateIndex
CREATE INDEX "roster_status_idx" ON "roster"("status");

-- CreateIndex
CREATE INDEX "roster_start_date_end_date_idx" ON "roster"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "roster_shift_type_idx" ON "roster"("shift_type");

-- CreateIndex
CREATE UNIQUE INDEX "shift_type_config_shift_type_key" ON "shift_type_config"("shift_type");

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
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_is_active_idx" ON "user"("is_active");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_module_code_key" ON "permission_module"("code");

-- CreateIndex
CREATE INDEX "permission_module_is_active_idx" ON "permission_module"("is_active");

-- CreateIndex
CREATE INDEX "permission_module_sort_order_idx" ON "permission_module"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_is_active_idx" ON "permission"("is_active");

-- CreateIndex
CREATE INDEX "permission_action_idx" ON "permission"("action");

-- CreateIndex
CREATE UNIQUE INDEX "permission_module_id_action_key" ON "permission"("module_id", "action");

-- CreateIndex
CREATE INDEX "role_permission_role_idx" ON "role_permission"("role");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_permission_id_key" ON "role_permission"("role", "permission_id");

-- CreateIndex
CREATE INDEX "leave_staff_id_idx" ON "leave"("staff_id");

-- CreateIndex
CREATE INDEX "leave_start_date_end_date_idx" ON "leave"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "leave_leave_type_idx" ON "leave"("leave_type");

-- CreateIndex
CREATE INDEX "leave_status_idx" ON "leave"("status");

-- CreateIndex
CREATE INDEX "public_holiday_year_idx" ON "public_holiday"("year");

-- CreateIndex
CREATE UNIQUE INDEX "public_holiday_date_key" ON "public_holiday"("date");

-- CreateIndex
CREATE INDEX "_ConstraintToRoster_B_index" ON "_ConstraintToRoster"("B");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_staff_group_id_fkey" FOREIGN KEY ("staff_group_id") REFERENCES "staff_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "permission" ADD CONSTRAINT "permission_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "permission_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave" ADD CONSTRAINT "leave_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConstraintToRoster" ADD CONSTRAINT "_ConstraintToRoster_A_fkey" FOREIGN KEY ("A") REFERENCES "constraint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConstraintToRoster" ADD CONSTRAINT "_ConstraintToRoster_B_fkey" FOREIGN KEY ("B") REFERENCES "roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
