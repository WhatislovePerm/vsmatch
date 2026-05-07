using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchInvitesAndReadyStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "Matches",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Matches"
                SET "InviteCode" = substring(md5("Id"::text), 1, 10)
                WHERE "InviteCode" IS NULL OR "InviteCode" = '';
                """);

            migrationBuilder.AlterColumn<string>(
                name: "InviteCode",
                table: "Matches",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Matches_InviteCode",
                table: "Matches",
                column: "InviteCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Matches_InviteCode",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "Matches");
        }
    }
}
