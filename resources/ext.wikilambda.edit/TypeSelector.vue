<template>
	<!--
		WikiLambda Vue interface module for selecting a Type

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<select
		:value="type"
		@change="updateType($event)"
	>
		<option v-for="ztype in ztypes"
			:key="ztype.value"
			:value="ztype.value"
		>
			{{ ztype.label }} ({{ ztype.value }})
		</option>
	</select>
</template>

<script>

module.exports = {
	name: 'TypeSelector',
	props: {
		type: {
			type: String,
			default: ''
		}
	},
	data: function () {
		return {
			ztypes: null
		};
	},
	methods: {
		loadZTypes: function () {
			var index,
				editingData = mw.config.get( 'extWikilambdaEditingData' ),
				typeoptions = [];

			for ( index in editingData.ztypes ) {
				typeoptions.push( {
					value: index,
					label: editingData.ztypes[ index ]
				} );
			}

			this.ztypes = typeoptions;
		},
		updateType: function ( event ) {
			this.$emit( 'change', event.target.value );
		}
	},
	created: function () {
		this.loadZTypes();
	}
};
</script>
