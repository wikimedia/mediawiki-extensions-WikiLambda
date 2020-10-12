<template>
	<!--
		WikiLambda Vue component for editing multilingual text

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-multilingual">
		<div v-for="(z11Object, index) in monolingualStrings"
			:key="z11Object.Z11K1"
			class="ext-wikilambda-monolingual"
		>
			<div class="ext-wikilambda-cell">
				<button v-if="!viewmode"
					:title="tooltipRemoveLang"
					@click="removeLang(index)"
				>
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				{{ allLangs[z11Object.Z11K1] }} ({{ z11Object.Z11K1 }}):
			</div>
			<div class="ext-wikilambda-cell">
				<span v-if="viewmode" class="ext-wikilambda-zstring"> {{ z11Object.Z11K2 }} </span>
				<input v-else
					class="ext-wikilambda-zstring"
					:value="z11Object.Z11K2"
					@input="updateLangString($event, z11Object)"
				>
			</div>
		</div>
		<div class="ext-wikilambda-monolingual">
			<select v-if="!viewmode"
				:value="selectedLang"
				@change="addNewLang"
			>
				<option selected
					disabled
					value="None"
				>
					{{ $i18n( 'wikilambda-editor-label-addlanguage-label' ) }}
				</option>
				<option v-for="(langName, langId) in unusedLangList"
					:key="langId"
					:value="langId"
				>
					{{ langName }} ({{ langId }})
				</option>
			</select>
		</div>
	</div>
</template>

<script>

module.exports = {
	name: 'ZMultiLingualString',
	props: [ 'mlsObject', 'viewmode' ],
	computed: {
		monolingualStrings: {
			get: function () {
				var monoStrings = [];
				if ( 'Z12K1' in this.mlsObject ) {
					monoStrings = this.mlsObject.Z12K1;
				}
				return monoStrings;
			}
		},
		selectedLang: {
			get: function () {
				return 'None';
			}
		},
		unusedLangList: {
			get: function () {
				var langCode,
					unusedLangList = {};

				for ( langCode in this.allLangs ) {
					unusedLangList[ langCode ] = this.allLangs[ langCode ];
				}
				if ( 'Z12K1' in this.mlsObject ) {
					this.mlsObject.Z12K1.forEach(
						function ( z11Object ) {
							langCode = z11Object.Z11K1;
							delete unusedLangList[ langCode ];
						}
					);
				}
				return unusedLangList;
			}
		}
	},
	methods: {
		updateLangString: function ( event, z11Object ) {
			z11Object.Z11K2 = event.target.value;
			this.$emit( 'input', this.mlsObject );
		},
		addNewLang: function ( event ) {
			var langId = event.target.value;
			if ( langId !== 'None' ) {
				if ( !( 'Z12K1' in this.mlsObject ) ) {
					this.$set( this.mlsObject, 'Z12K1', [] );
				}
				this.mlsObject.Z12K1.push(
					{
						Z1K1: 'Z11',
						Z11K1: langId,
						Z11K2: ''
					}
				);
			}
			this.$emit( 'input', this.mlsObject );
		},
		removeLang: function ( index ) {
			this.mlsObject.Z12K1.splice( index, 1 );
			this.$emit( 'input', this.mlsObject );
		}
	},
	data: function () {
		var allLangs = mw.config.get( 'extWikilambdaEditingData' ).zlanguages,
			tooltipRemoveLang = this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' );

		return {
			allLangs: allLangs,
			tooltipRemoveLang: tooltipRemoveLang
		};
	}
};
</script>

<style lang="less">
.ext-wikilambda-multilingual {
	display: block;
	padding: 1em;
	background: #efe;
	outline: 1px dashed #888;
}

.ext-wikilambda-monolingual {
	clear: both;
}

.ext-wikilambda-cell {
	float: left;
	padding: 0;

	.ext-wikilambda-zstring {
		vertical-align: bottom;
		margin-left: 0.5em;
		margin-top: 4px;
	}
}
</style>
