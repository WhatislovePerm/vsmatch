using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCourtAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: на проде колонка могла быть добавлена руками (после
            // того как EF сгенерил пустую миграцию из-за дрифта snapshot'а).
            migrationBuilder.Sql(
                "ALTER TABLE \"Courts\" ADD COLUMN IF NOT EXISTS \"Address\" character varying(512) NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Address", table: "Courts");
        }
    }
}
