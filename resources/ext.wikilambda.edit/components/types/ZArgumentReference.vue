<template>
	<div>
		<select
			v-if="!viewmode"
			v-model="selectedArgument"
			class="ext-wikilambda-zargument-reference"
		>
			<option value="" disabled>
				{{ $i18n( "wikilambda-argref-default-label" ) }}
			</option>
			<option
				v-for="argument in getZarguments"
				:key="argument.zid"
				:value="argument.zid"
			>
				{{ argument.label }}
			</option>
		</select>
		<template v-else>
			{{ getZarguments[ selectedArgument ].label }}
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectById: 'getZObjectById',
			getZObjectChildrenById: 'getZObjectChildrenById',
			viewmode: 'getViewMode',
			getZarguments: 'getZarguments'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zArgumentReferenceKey: function () {
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_ARGUMENT_REFERENCE_KEY, this.zobject ).id
					)
				);
			},
			selectedArgument: {
				get: function () {
					return this.zArgumentReferenceKey.value || '';
				},
				set: function ( val ) {
					this.setZObjectValue( {
						id: this.zArgumentReferenceKey.id,
						value: val
					} );
				}
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue' ] )
	)
};
</script>

<style lang="less">
.ext-wikilambda-zargument-reference {
	display: inline-block;
	margin-top: 5px;
}
</style>
