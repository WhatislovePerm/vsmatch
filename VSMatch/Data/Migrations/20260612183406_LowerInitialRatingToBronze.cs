using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class LowerInitialRatingToBronze : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "Rating",
                table: "UserRatings",
                type: "double precision",
                nullable: false,
                defaultValue: 750.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 1000.0);

            // Существующие записи с нетронутым дефолтом (ровно 1000) опускаем на новый старт.
            migrationBuilder.Sql("UPDATE \"UserRatings\" SET \"Rating\" = 750 WHERE \"Rating\" = 1000;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "Rating",
                table: "UserRatings",
                type: "double precision",
                nullable: false,
                defaultValue: 1000.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 750.0);
        }
    }
}
