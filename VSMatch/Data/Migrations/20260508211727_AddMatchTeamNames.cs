using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchTeamNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TeamAName",
                table: "Matches",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Команда A");

            migrationBuilder.AddColumn<string>(
                name: "TeamBName",
                table: "Matches",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Команда B");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeamAName",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "TeamBName",
                table: "Matches");
        }
    }
}
