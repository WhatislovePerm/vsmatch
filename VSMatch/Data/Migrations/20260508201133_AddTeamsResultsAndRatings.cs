using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamsResultsAndRatings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Rating",
                table: "Users",
                type: "double precision",
                nullable: false,
                defaultValue: 1000.0);

            migrationBuilder.AddColumn<int>(
                name: "Assists",
                table: "MatchPlayers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Goals",
                table: "MatchPlayers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "RatingDelta",
                table: "MatchPlayers",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Team",
                table: "MatchPlayers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "TeamA");

            migrationBuilder.AddColumn<DateTime>(
                name: "ResultSubmittedAt",
                table: "Matches",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TeamAScore",
                table: "Matches",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TeamBScore",
                table: "Matches",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Assists",
                table: "MatchPlayers");

            migrationBuilder.DropColumn(
                name: "Goals",
                table: "MatchPlayers");

            migrationBuilder.DropColumn(
                name: "RatingDelta",
                table: "MatchPlayers");

            migrationBuilder.DropColumn(
                name: "Team",
                table: "MatchPlayers");

            migrationBuilder.DropColumn(
                name: "ResultSubmittedAt",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "TeamAScore",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "TeamBScore",
                table: "Matches");
        }
    }
}
