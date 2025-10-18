import { studyPrograms } from "@/db/schema";
import logger from "@/services/logger";
import { Transaction } from "@/types/seeder";

export default {
	seed: async (tx: Transaction) => {
		logger.info("Seeding study program...");

		const departmentList = await tx.query.departments.findMany({
			columns: { id: true, name: true }
		});
		const departmentMap = departmentList.reduce((acc, dept) => {
			acc[dept.name] = dept.id;
			return acc;
		}, {} as Record<string, string>);

		const { rowCount } = await tx
			.insert(studyPrograms)
			.values([
				// Teknik Elektro
				{
					name: "Teknik Elektronika",
					departmentId: departmentMap["Teknik Elektro"]
				},
				{
					name: "Teknik Telekomunikasi",
					departmentId: departmentMap["Teknik Elektro"]
				},
				{
					name: "Teknik Elektro Industri",
					departmentId: departmentMap["Teknik Elektro"]
				},
				{
					name: "Teknik Rekayasa Internet",
					departmentId: departmentMap["Teknik Elektro"]
				},

				// Teknik Informatika dan Komputer
				{
					name: "Teknik Informatika",
					departmentId: departmentMap["Teknik Informatika dan Komputer"]
				},
				{
					name: "Teknik Komputer",
					departmentId: departmentMap["Teknik Informatika dan Komputer"]
				},
				{
					name: "Sains Data Terapan",
					departmentId: departmentMap["Teknik Informatika dan Komputer"]
				},

				// Teknik Mekanika dan Energi
				{
					name: "Teknik Mekatronika",
					departmentId: departmentMap["Teknik Mekanika dan Energi"]
				},
				{
					name: "Sistem Pembangkit Energi",
					departmentId: departmentMap["Teknik Mekanika dan Energi"]
				},

				// Teknologi Multimedia Kreatif
				{
					name: "Teknologi Multimedia Broadcasting",
					departmentId: departmentMap["Teknologi Multimedia Kreatif"]
				},
				{
					name: "Teknologi Game",
					departmentId: departmentMap["Teknologi Multimedia Kreatif"]
				},
				{
					name: "Teknologi Rekayasa Multimedia",
					departmentId: departmentMap["Teknologi Multimedia Kreatif"]
				}
			])
			.onConflictDoNothing();

		logger.info(`Seeded ${rowCount} study program(s)`);
	}
};
