<template>
	<!--
		WikiLambda Vue component for editing multilingual text

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-multilingual">
		<div v-for="(z11Object, index) in monolingualStrings"
			:key="z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]"
			class="ext-wikilambda-monolingual"
		>
			<div class="ext-wikilambda-cell">
				<button v-if="!viewmode"
					:title="tooltipRemoveLang"
					@click="removeLang(index)"
				>
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				{{ allLangs[ z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ] }} ({{ z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] }}):
			</div>
			<div class="ext-wikilambda-cell">
				<span v-if="viewmode" class="ext-wikilambda-zstring"> {{ z11Object[ Constants.Z_MONOLINGUALSTRING_VALUE ] }} </span>
				<input v-else
					class="ext-wikilambda-zstring"
					:value="z11Object[ Constants.Z_MONOLINGUALSTRING_VALUE ]"
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
var Constants = require( '../../Constants.js' ),
	mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'ZMultilingualString',
	props: {
		mlsObject: {
			type: Object,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( {},
		mapState( [ 'allLangs' ] ),
		{
			monolingualStrings: {
				get: function () {
					var monoStrings = [];
					if ( Constants.Z_MULTILINGUALSTRING_VALUE in this.mlsObject ) {
						monoStrings = this.mlsObject[ Constants.Z_MULTILINGUALSTRING_VALUE ];
					}
					return monoStrings;
				}
			},
			tooltipRemoveLang: function () {
				return this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' );
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
					if ( Constants.Z_MULTILINGUALSTRING_VALUE in this.mlsObject ) {
						this.mlsObject[ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach(
							function ( z11Object ) {
								langCode = z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
								delete unusedLangList[ langCode ];
							}
						);
					}
					return unusedLangList;
				}
			}
		}
	),
	methods: $.extend( {},
		mapGetters( [ 'zLang' ] ),
		mapActions( [ 'fetchAllLangs' ] ),
		{
			updateLangString: function ( event, z11Object ) {
				z11Object[ Constants.Z_MONOLINGUALSTRING_VALUE ] = event.target.value;
				this.$emit( 'input', this.mlsObject );
			},
			addNewLang: function ( event ) {
				var langId = event.target.value,
					pushObj = {};
				if ( langId !== 'None' ) {
					if ( !( Constants.Z_MULTILINGUALSTRING_VALUE in this.mlsObject ) ) {
						this.$set( this.mlsObject, Constants.Z_MULTILINGUALSTRING_VALUE, [] );
					}
					pushObj[ Constants.Z_OBJECT_TYPE ] = Constants.Z_MONOLINGUALSTRING;
					pushObj[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] = langId;
					pushObj[ Constants.Z_MONOLINGUALSTRING_VALUE ] = '';
					this.mlsObject[ Constants.Z_MULTILINGUALSTRING_VALUE ].push( pushObj );
				}
				this.$emit( 'input', this.mlsObject );
			},
			removeLang: function ( index ) {
				this.mlsObject[ Constants.Z_MULTILINGUALSTRING_VALUE ].splice( index, 1 );
				this.$emit( 'input', this.mlsObject );
			}
		}
	),
	created: function () {
		this.fetchAllLangs();
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
