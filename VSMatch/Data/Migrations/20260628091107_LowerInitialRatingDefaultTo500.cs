using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMatch.Data.Migrations
{
    /// <inheritdoc />
    public partial class LowerInitialRatingDefaultTo500 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "Rating",
                table: "UserRatings",
                type: "double precision",
                nullable: false,
                defaultValue: 500.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 750.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "Rating",
                table: "UserRatings",
                type: "double precision",
                nullable: false,
                defaultValue: 750.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 500.0);
        }
    }
}
