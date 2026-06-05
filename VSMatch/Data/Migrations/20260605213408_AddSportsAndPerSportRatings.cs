using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSportsAndPerSportRatings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Структурные добавления (могут идти в любом порядке кроме переноса Rating).
            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Sport",
                table: "Matches",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Football");

            migrationBuilder.AddColumn<string>(
                name: "SportKind",
                table: "Courts",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Football");

            // 2. Новая таблица UserRatings
            migrationBuilder.CreateTable(
                name: "UserRatings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sport = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: false, defaultValue: 1000.0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRatings", x => new { x.UserId, x.Sport });
                    table.ForeignKey(
                        name: "FK_UserRatings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 3. ПЕРЕНОС ДАННЫХ: текущий User.Rating → UserRatings(sport=Football).
            // Делаем до удаления колонки, иначе данные потеряются.
            migrationBuilder.Sql(@"
                INSERT INTO ""UserRatings"" (""UserId"", ""Sport"", ""Rating"")
                SELECT ""Id"", 'Football', ""Rating"" FROM ""Users""
                ON CONFLICT (""UserId"", ""Sport"") DO NOTHING;
            ");

            // 4. Теперь безопасно дропнуть Rating из Users.
            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Users");

            // 5. Индексы
            migrationBuilder.CreateIndex(
                name: "IX_Matches_Sport",
                table: "Matches",
                column: "Sport");

            migrationBuilder.CreateIndex(
                name: "IX_Courts_SportKind",
                table: "Courts",
                column: "SportKind");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Rating",
                table: "Users",
                type: "double precision",
                nullable: false,
                defaultValue: 1000.0);

            // Обратный перенос — берём Football рейтинг
            migrationBuilder.Sql(@"
                UPDATE ""Users"" u
                SET ""Rating"" = ur.""Rating""
                FROM ""UserRatings"" ur
                WHERE ur.""UserId"" = u.""Id"" AND ur.""Sport"" = 'Football';
            ");

            migrationBuilder.DropTable(
                name: "UserRatings");

            migrationBuilder.DropIndex(
                name: "IX_Matches_Sport",
                table: "Matches");

            migrationBuilder.DropIndex(
                name: "IX_Courts_SportKind",
                table: "Courts");

            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Sport",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "SportKind",
                table: "Courts");
        }
    }
}
